from numpy import min, std, log, zeros, arange, where, hstack, sum, diff
from scipy.stats import linregress
from math import ceil

from multiprocessing import Pool
from time import sleep
from warnings import catch_warnings, simplefilter

from bathysphere_array.utils import subset, Array, crop, filter_in_range, interp2d_nearest
from bathysphere_array.storage import Dataset


def colorize(data):
    # type: (Array) -> Array
    """
    Convert data field to color and transparency components
    """
    normalized = (data - data.min()) / (data.max() - data.min())
    colors = zeros((*data.shape, 4), dtype=int) + 255
    colors[:, :, :, 0] *= normalized  # red
    colors[:, :, :, 1] *= 0  # green
    colors[:, :, :, 2] *= 1 - normalized  # blue
    colors[:, :, :, 3] *= 0.5 * normalized  # alpha
    return colors


def landsat_sst_regression(raw, lon, lat, roi, samples, outliers, nsub=10):
    # type: (Array, Array, Array, (Array,), tuple, tuple, int ) -> Array or None
    """
    Calculate SST by removing outliers
    """

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
    avhrr_filtered = samples[indices].reshape(-1, 1)  # extract unmasked AVHRR values
    ls_filtered = btemp[indices].reshape(-1, 1)  # extract

    # Regress Landsat and AVHRR
    fit = 0.0
    intercept = None
    slope = None

    while True:
        pairs = hstack((avhrr_filtered, ls_filtered))
        _slope, _intercept, r, pval, stderr = linregress(pairs)  # regress
        if (abs(r) - abs(fit)) < 0.000001:  # if r-value is improving
            break

        slope = _slope
        intercept = _intercept
        fit = r
        gtruth = avhrr_filtered * _slope + _intercept  # "true" values
        residual = abs(ls_filtered - gtruth)  # difference between observations
        stdv = std(ls_filtered)  # landsat standard deviation
        keepers, junk = where(residual < stdv)
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


def oc3algorithms():
    """
    read OC3 chlorophyll from netcdf for land mask
    chl_sub = subset(chl, n)
    mask land using chl_oc3 NaN land mask
    Save results to NetCDF file
    Plot: SST, AVHRR interp, landsat versus AVHRR;  w/ bounding box overlay
    regress AV filter 2 and LS filter 2 for R2 and P values
    """
    ...


def avhrr_sst(files, locations, processes=1, chunk=4, delay=1):
    # type: (dict, dict, int, int, int) -> Array
    """
    Get year time series of AVHRR temperature

    :param files: files to scrap
    :param locations: get nearest neighbors of these locations
    :param chunk: number to retrieve per batch
    :param delay: Ending (inclusive) datetime day
    :param processes: number of processes to use
    """

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

        indices, = where(~found)
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


def kelvin2celsius(data):
    # type: (Array) -> Array
    return data - 272.15


def brightness_temperature(x, m=3.3420e-04, b=0.1, k1=774.89, k2=1321.08):
    # type: (Array, float, float, float, float) -> Array
    """Brightness temperature from Band 10 raw counts"""
    radiance = m * x + b
    return (k2 / log((k1 / radiance) + 1)) - 272.15


def viscosity(temperature):
    # type: (Array) -> Array
    """Viscosity from temperature"""
    return 10.0 ** (-3.0) * 10.0 ** (-1.65 + 262.0 / (temperature + 169.0))


def vertical_flux(omega, area):
    # type: (Array, Array) -> Array
    """Vertical flux density"""
    return omega * area[:, None]


def attenuation(bathymetry, elevation, sigma, coefficients):
    # type: (Array, Array, Array, Array) -> Array
    """Attenuated light"""
    return (elevation - bathymetry) * sigma[:, None] * coefficients


def lagrangian_displacement(delta, window=10):
    # type: (Array, int) -> Array
    """
    Average displacement over one hour time window

    :param window: steps for boxcar filter
    :param delta: movement vectors
    :return: average displacement of group over time
    """

    def reduce(start, end):
        indices = arange(start, end)
        mean_sq_displacement = delta[:, :, indices].sum(axis=2) ** 2
        return 0.25 / 60 * mean_sq_displacement.sum(axis=0)

    steps = delta.shape[2]
    displace = zeros((delta.shape[1], steps))
    for time in range(window, steps):  # per particle time series
        displace[:, time] = reduce(time - window, time)
    return displace.mean(axis=0)


def lagrangian_diffusion(
    vertex_array_buffer, window, bins, groups, threshold, wrap, steps=240
):
    # type: ((Array, ), int, int, Array, float, bool, int) -> (Array,)
    """
    Mean diffusion over time

    :param vertex_array_buffer:
    :param window: number of steps to average for displacement
    :param bins: days/bins per experiment
    :param groups: groups by array index
    :param steps: steps per day/bin
    :param threshold: distance to trigger wrap
    :param wrap: amount to compensate for periodic domains
    """

    delta = diff(vertex_array_buffer, axis=2)
    if threshold is not None and wrap is not None:
        delta -= wrap * (delta > threshold)
        delta += wrap * (delta < -threshold)

    displace = lagrangian_displacement(delta, window=window)
    ii = arange(bins) * steps
    return tuple(
        displace[indices, ii : ii + steps - 1].mean(axis=0) for indices in groups
    )
