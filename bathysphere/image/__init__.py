# pylint: disable=invalid-name
from collections import deque
from numpy import array, arange
from matplotlib import cm


def consume(streams: [array], select: {str} = None) -> dict:
    """
    Consume incoming data stream, destructively
    """
    d = dict()
    _series = deque(streams)
    _inits = _series.popleft()
    _defaults = _series.popleft()
    while _series:
        for key, val in _series.popleft().items():
            if select is not None and key not in select:
                continue
            if d.get(key) is None:
                d[key] = [val]
            else:
                d[key].append(val)
    return d


def palette(keys: {str}, colorMap: str = "Spectral") -> dict:
    """
    create color dictionary for visualization
    """
    nc = len(keys)
    colors = arange(nc) / (nc - 1)
    scale = array([1, 1, 1, 0.5])
    return dict(zip(keys, (cm.get_cmap(colorMap))(colors) * scale))
