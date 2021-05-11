from numpy import array
"""
Requires `numpy`, `netCDF4`, and `scipy`
"""
def avhrr_sst(
    files: dict, 
    locations: dict, 
    processes: int = 1, 
    chunk: int = 4, 
    delay: int = 1
):
    """
    Get  time series of AVHRR temperature

    :param files: files to scrape
    :param locations: get nearest neighbors of these locations
    :param chunk: number to retrieve per batch
    :param delay: Ending (inclusive) datetime day
    :param processes: number of processes to use
    """
    from numpy import zeros, arange, ceil, where, std
    from time import sleep
    from multiprocessing import Pool
    from warnings import simplefilter, catch_warnings
    from netCDF4 import Dataset  # pylint: disable=no-name-in-module

    total = len(files)
    sst = {key: zeros(total, dtype=float) for key in locations.keys()}
    found = zeros(total, dtype=bool)
    indices = arange(total, dtype=int)

    iteration = 0
    while True:
        pool = Pool(processes)
        jobs = len(indices)
        batches = ceil(jobs / chunk)
        with catch_warnings():
            simplefilter("ignore")
            failures = 0
            for ii in range(batches):

                a = ii * chunk
                b = (ii + 1) * chunk
                new = indices[a:b] if b < len(indices) else indices[a:]
                results = pool.map(Dataset.query, files[new])

                for jj in range(len(new)):
                    if results[jj] is not None:
                        _index = new[jj]
                        found[_index] = True
                        for key in results[jj].keys():
                            sst[key][_index] = results[jj][key]
                    else:
                        failures += 1

        (indices,) = where(~found)
        count = sum(found)

        try:
            assert count + failures == total
        except AssertionError:
            break
        if found.all():
            break
        iteration += 1
        sleep(delay)

    return sst


def landsat_sst_regression(
    raw: array, 
    lon: array, 
    lat: array, 
    roi: (array), 
    samples: array, 
    outliers: (float, float), 
    nsub: int = 10
):
    """
    Calculate SST by removing outliers
    """
    from numpy import hstack, where, log, std
    from scipy.stats import linregress
    from capsize.utils import filter_in_range, crop, interp2d_nearest, subset

    def brightness_temperature(
        x, 
        m: float = 3.3420e-04, 
        b: float = 0.1, 
        k1: float = 774.89, 
        k2: float = 1321.08
    ):
        """
        Brightness temperature from Band 10 raw counts
        """
        radiance = m * x + b
        return (k2 / log((k1 / radiance) + 1)) - 272.15

    # Load satellite data and subset it
    btemp = brightness_temperature(raw)
    subbt = subset(btemp, nsub)
    samples = interp2d_nearest((lon, lat, btemp), samples=samples)

    # Generate masks
    mask = crop(lon, lat, roi)
    mask = filter_in_range(mask, btemp, maximum=-10)  # mask clouds 124.6
    mask |= (
        (samples < outliers[0]) | (samples > outliers[1]) | (btemp < min(subbt))
    )  # combine masks
    indices = where(~mask)  # get unmasked linear indices
    avhrr_filtered = samples[indices].reshape(-1, 1)  # unmasked AVHRR
    ls_filtered = btemp[indices].reshape(-1, 1)  # extract

    # Regress Landsat and AVHRR
    previous = 0.0
    intercept = None
    slope = None

    while True:
        pairs = hstack((avhrr_filtered, ls_filtered))
        _slope, _intercept, fit, _, _ = linregress(pairs)  # regress
        if (abs(fit) - abs(previous)) < 0.000001:  # if r-value is improving
            break

        slope = _slope
        intercept = _intercept
        previous = fit

        residual = abs(ls_filtered - avhrr_filtered * _slope + _intercept)  # difference between observations
        
        # landsat standard deviation
        keepers, _ = where(residual < std(ls_filtered))
        if len(keepers) == 0:
            break

        ls_filtered = ls_filtered[keepers]
        avhrr_filtered = avhrr_filtered[keepers]

    if not slope or not intercept:
        return None

    sst = (btemp - intercept) / slope  # full resolution version for output

    # if crop:  # sparse sub-sampling
    #     submask = subset(mask, nsub)
    #     subsst = subset(sst, nsub)
    #     sublat = subset(lat, nsub)
    #     sublon = subset(lon, nsub)

    return sst

