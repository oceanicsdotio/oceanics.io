from numpy import log10, log
from datetime import datetime


def hc2pH(hc):
    pH = -log10(hc / 10 ** 9)
    return pH


def pH2hc(pH):
    hc = 10 ** (-pH)
    return hc * (10 ** 9)


def rxnConstant_pH(pH0, pH1, residence_time):
    return -log(10 ** (pH0 - pH1)) / residence_time


def rxnConstant_gen(initial_concentration, final_concentration, residence_time):
    return -log(final_concentration - initial_concentration) / residence_time


def fahr2cel(data):
    return (data-32.)/1.8


def days(date):
    """Convert a single datetime to a Julian day number"""
    delta = date - datetime(date.year, 1, 1, 0, 0, 0)
    result = delta.total_seconds()/24/60/60
    return result


def interp1d(coefficient, aa, bb):
    """Simple linear interpolation in one dimension"""
    return (1.0-coefficient)*aa + coefficient*bb
