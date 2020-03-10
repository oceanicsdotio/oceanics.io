from numpy import abs, zeros, arange, ones, convolve, isnan, ceil
from scipy.fftpack import rfft, irfft, fftfreq
from statistics import median
from .utils import interp1d


def smooth(yy, bandwidth, mode="same"):
    """Smooth using convolution"""
    return convolve(yy, ones((bandwidth,))/bandwidth, mode=mode)


def outlier(yy, rr=3.5):
    """ Return array of logical values, with true indicating outliers """
    diff = abs(yy - median(yy))  # difference between series and median (anomaly)
    mad = median(diff)  # median of anomaly
    mod_z = 0.6745 * diff / mad 
    return mod_z > rr


def out_of_range(val, maximum, minimum=0.0):
    """Return true if value is outside the given range"""
    return (val > maximum) | (val < minimum)


def outlier_time(time, series, threshold=3.5):
    """
    Return array of logical values, with true indicating that the value or its 
    first derivative are outliers
    """
    dydt = [0.0]
    deltat = [0.0]
    
    for nn in range(1, len(series)):
        deltat.append(time[nn] - time[nn-1])
        dydt.append((series[nn] - series[nn-1])/deltat[nn])
        
    return outlier(dydt, rr=threshold)


def fft_spectrum(yy, dt, fill, compress):

    if fill:
        yy = yy.ffill()  # forward-fill missing values

    ww = fftfreq(len(yy), d=dt)  # frequency indices
    freq = rfft(yy)  # transform to frequency domain
    if compress:
        mask = (ww < 0.0)
        freq[mask] = 0.0  # get rid of negative symmetry

    return freq, ww


def fft_filter(yy, dt=1, lowpass=None, highpass=None, fill=False, compress=True):
    """
    Perform frequency-domain filtering on regularly spaced time series
    
    Kwargs:
    
        tt, float[] :: time series
        yy, float[] :: reference series
        dt, float :: regular timestep
        lowpass, float :: lower cutoff
        highpass, float :: upper cutoff
    """

    freq, ww = fft_spectrum(yy, dt, fill, compress)

    if highpass is not None:
        mask = (ww < highpass)
        freq[mask] = 0.0  # zero out low frequency

    if lowpass is not None:
        mask = (ww > lowpass)
        freq[mask] = 0.0  # zero out high-frequency
    
    return irfft(freq)


def resample(nobs, start, dates, series, method="forward"):
    """
    Generate filled regular time series of a variable from sparse observations
    using either backward/forward fill, or linear interpolation
    
    Kwargs:
        nobs, int :: number of observations
        start, datetime :: starting time index
        dates, datetime[] :: timestamps of observations
        series, float[] :: magnitude of observations
        method, str :: method if interpolation
        
    returns: array of filled values as single column
    """

    new = zeros(nobs, dtype=float)
    total = 0  # new observations created
    previous = None
    dtdt = None

    for ii in range(len(series)):
        time = dates[ii]
        signal = series[ii]
        if not isnan(signal):
            dt = time - start
            hours = dt.days * 24 + dt.seconds / 60 / 60  # hours elapsed since first sample
            if hours > 0:  # reference time is after start time
                end = min(ceil(hours), nobs)  # absolute end index
                span = end - total  # width of subset

                if method is "forward":
                    first = total
                    if ii == len(series) - 1:
                        span += nobs - end

                    last = total + span  # not including self
                    new[first:last] = signal if previous is None else previous  # default to back-fill

                elif method is "back":
                    first = total  # including self
                    last = total + span - 1
                    new[first:last] = signal

                elif method is 'interp':
                    if dtdt is None:
                        fill = signal  # default to forward fill
                    else:
                        delta = end - dtdt  # get step between input obs
                        coefs = arange(delta) / delta  # inter-step interpolation coefficient
                        fill = interp1d(coefs, previous, signal)

                    first = max([total - 1, 0])
                    new[first:total + span - 1] = fill

                dtdt = dt
                total += span

            previous = signal

    return new
