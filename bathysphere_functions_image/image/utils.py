from numpy import arange, array
from itertools import repeat
from matplotlib import cm
from collections import deque


def consume(streams, select=None):
    # type: (list, set) -> dict
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


def palette(keys, colorMap="Spectral"):
    # type: ({str}, str) -> dict
    """create color dictionary for visualization"""
    nc = len(keys)
    colors = arange(nc) / (nc - 1)
    scale = array([1, 1, 1, 0.5])
    return dict(zip(keys, (cm.get_cmap(colorMap))(colors) * scale))


def series(figure, data, labels=None, extent=None, unwind=True, scatter=True):

    for dataset, label in zip(data.get("series", ()), labels or repeat("none")):
        x, y = zip(*dataset) if unwind else dataset
        figure.plot(x, y, label=label, scatter=scatter)
        new = [min(x), max(x), min(y), max(y)]
        if extent is None:
            extent = new.copy()
        for ii in range(len(new) // 2):
            a = ii * 2
            b = a + 1
            extent[a] = min((extent[a], new[a]))
            extent[b] = max((extent[b], new[b]))

    return (
        30, 5
    ) if extent else (
        None, None
    )


def coverage(figure, data, bins=20):
    t = data.get("time")
    _ = figure.coverage(t, bins=bins)
    return (int(max(t) - min(t)) // 6), (len(t) // bins // 2)


def frequency(figure, data, bins=10):
    y = data.get("value")
    _ = figure.frequency(y, bins=bins)
    return int(max(y) - min(y)) // 6, len(y) // bins // 2


def spatial(fig, data, **kwargs):
    # type: (Spatial, dict, dict) -> BytesIO or None
    imageHandles = []
    for image, imageExtent in data.get("images", ()):
        imageHandles.append(fig.ax.imshow(image, extent=imageExtent, interpolation=fig.style["imageInterp"]))
    shapeHandles = tuple(map(fig.shape, data.pop("polygons", ()), repeat({"edgecolor": "black", "facecolor": "none"})))
    pointHandles = tuple(map(fig.points, (array(p) for p in data.pop("points", ()))))
    return None if not any((imageHandles, shapeHandles, pointHandles)) else fig.push()
