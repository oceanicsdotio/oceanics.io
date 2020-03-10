from .core import *
from connexion import request


def response(status, payload):
    return {
        "status": status,
        "payload": list(payload),
    }


def fft(dt=1, lowpass=None, highpass=None, fill=False, compress=True):

    series = tuple(item.value for item in request.json)
    filtered = fft_filter(series, dt, lowpass, highpass, fill, compress)
    return response(
        200,
        payload=filtered
    )


def spectrum(dt=1, fill=False, compress=True):

    series = tuple(item.value for item in request.json)
    freq, index = fft_spectrum(series, dt, fill, compress)
    return response(
        200,
        payload={
            "frequency": freq,
            "index": index
        }
    )


def smooth_convolve(bandwidth, mode="same"):
    """
    Convolve

    :return:
    """

    series = tuple(item.value for item in request.json)
    filtered = smooth(series, bandwidth, mode)
    return response(200, payload=filtered)


def resample_sparse_series(method="forward", observations=None, start=None):

    dates = tuple(item.time for item in request.json)
    series = tuple(item.value for item in request.json)

    if not observations:
        observations = (dates[-1] - dates[0]).hours + 1

    if not start:
        start = dates[0]

    filtered = resample(observations, start, dates, series, method=method)
    return response(200, payload=filtered)


def outlier_handler(method, threshold):

    dates = tuple(item.time for item in request.json)
    series = tuple(item.value for item in request.json)

    if method == "time":
        mask = outlier_time(dates, series, threshold)

    if method == "simple":
        mask = outlier(series, rr=threshold)

    return response(200, payload=mask)


def outlier_range(min, max):
    series = tuple(item.value for item in request.json)
    mask = out_of_range(series, maximum=max, minimum=min)

    return response(200, payload=mask)
