from matplotlib import use
use("agg")

from numpy import ceil, max, min, arange, isnan, array, hstack
from matplotlib.pyplot import subplots, subplots_adjust
from matplotlib import rc, cm
from matplotlib.ticker import MultipleLocator, FormatStrFormatter
from matplotlib.patches import Polygon
from matplotlib.dates import DateFormatter, MonthLocator, DayLocator
from io import BytesIO
from json import loads as load_json
from collections import deque
from multiprocessing import Pool
from yaml import load, Loader

ResponseJSON = (dict, int)
ResponseOctet = (dict, int)
_styles = load(open("config/styles.yml"), Loader)


class View:
    count = 0

    def __init__(self, style: dict, extent: list = None):
        """
        Setup and return figure and axis instances
        """

        rc("text", usetex=False)
        rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
        rc("mathtext", default="sf")
        rc("lines", markeredgewidth=1, linewidth=style["line"])
        rc("axes", labelsize=style["text"], linewidth=(style["line"] + 1) // 2)
        rc("xtick", labelsize=style["text"])
        rc("ytick", labelsize=style["text"])
        rc("xtick.major", pad=5)
        rc("ytick.major", pad=5)

        self.style = style
        self.extent = extent
        self.fig, self.ax = subplots(
            facecolor=style["bg"], figsize=(style["width"], style["height"])
        )
        padding = style["padding"]
        subplots_adjust(
            left=padding[0], bottom=padding[1], right=1 - padding[2], top=1 - padding[3]
        )

    def format(self, bg: str, contrast: str, **kwargs):
        """
        Setup color styles for figure
        """
        self.ax.patch.set_facecolor(bg)  # background colors
        self.ax.edgecolor = contrast  # plotting area border
        self.format_axis("x", contrast, **kwargs)
        self.format_axis("y", contrast, **kwargs)

    def format_axis(
        self, axis: str, contrast: str, label: str, grid: bool, **kwargs: dict
    ):
        if axis in ("x", "X"):
            apply = self.ax.xaxis
            spines = ("left", "right")
        elif axis in ("y", "Y"):
            apply = self.ax.yaxis
            spines = ("top", "bottom")
        else:
            raise ValueError

        apply.label.set_color(label)
        self.ax.tick_params(axis=axis.lower(), colors=label)
        for each in spines:
            self.ax.spines[each].set_color(contrast)
        apply.grid(grid)

    def pre_push(self):
        self.fig.canvas.draw()
        self.format(**self.style)
        self.ax.set_frame_on(True)

    def push(self, encoding: str = "png", transparent: bool = False, **kwargs):
        buffer = BytesIO()
        self.fig.savefig(buffer, format=encoding, transparent=transparent, **kwargs)
        buffer.seek(0)
        return buffer

    def legend(self, loc: str = "best", fc: str = "none", ec: str = "none"):
        """
        Format figure legend

        Kwargs:
            loc, str -- location on plotting area
            fc, str/arr -- string or RGBA color for face
            ec, str/arr -- string or RGBA color for edges

        Returns: matplotlib legend object
        """
        legend = self.ax.legend(loc=loc)
        frame = legend.get_frame()
        frame.set_facecolor(fc)
        frame.set_edgecolor(ec)

        for text in legend.get_texts():
            text.set_color(self.style["contrast"])


def palette(keys: set, cmap: str = "Spectral"):
    """create color dictionary for visualization"""
    nc = len(keys)
    colors = arange(nc) / (nc - 1)
    scale = array([1, 1, 1, 0.5])
    return dict(zip(keys, (cm.get_cmap(cmap))(colors) * scale))


def apply_style(conf: dict, declared: dict, default_base: str = "dark"):
    base = declared.pop("base", default_base)
    try:
        style = conf["styles"][base].copy()
    except KeyError:
        return "Style not found", 404
    style.update(**declared)
    return style


def apply_series(
    data, figure, label: str = "Unnamed", scatter: bool = True, unwind=True
):

    x, y = zip(*data) if unwind else (data[0], data[1])
    if len(x) != len(y):
        raise IndexError
    figure.plot(x, y, label=label, scatter=scatter)
    return min(x), max(x), min(y), max(y)


def update_extent(new, old=None):
    if old is None:
        old = new
    if (len(old) != len(new)) or (len(old) % 2 != 0):
        raise ValueError

    output = [item for item in old]
    for ii in range(len(new) // 2):
        a = ii * 2
        b = a + 1
        output[a] = min((output[a], new[a]))
        output[b] = max((output[b], new[b]))
    return output


class Time(View):
    def _envelope(
        self,
        time: array,
        mean: array = None,
        deviation: array = None,
        facecolor: str = None,
        edgecolor="none",
        zorder: int = 3,
    ):
        """
        Add envelope to time series plot
        """
        color = facecolor if facecolor else self.style["face"]
        self.ax.fill_between(
            time,
            mean + deviation,
            mean - deviation,
            facecolor=facecolor,
            edgecolor="none",
            zorder=3,
        )

    def __fmt_time_axis(self, label, ticks, dates=False):
        # type: (str, int or float, bool) -> None
        """
        Format axes for X,Y plot similar to time series

        Kwargs:
            labs, string[] :: labels for axes
            locs, int[] :: spacing of ticks on axes
        """
        if self.extent is not None:
            self.ax.set_xlim(*self.extent[:2])

        self.ax.set_xlabel(label)

        if dates:
            self.ax.xaxis.set_major_locator(
                MonthLocator() if ticks >= 30 else DayLocator()
            )

            self.ax.xaxis.set_major_formatter(
                DateFormatter("%m/%y") if ticks >= 30 else DateFormatter("%m/%d")
            )

        else:
            self.ax.xaxis.set_major_locator(MultipleLocator(ticks))

    def __fmt_y_axis(self, label: str, ticks: float):
        """
        Format axes for X,Y plot similar to time series

        Kwargs:
            labs, string[] :: labels for axes
            locs, int[] :: spacing of ticks on axes
        """
        if self.extent is not None:
            self.ax.set_ylim(*self.extent[2:4])

        self.ax.set_ylabel(label)
        self.ax.yaxis.set_major_locator(MultipleLocator(ticks))

    def plot(
        self,
        time,
        series,
        label: str = "Unnamed",
        scatter: bool = True,
        color: str = None,
        alpha: float = None,
        marker: float = None,
    ):
        """Draw times series as scatter plot"""
        kwargs = {
            "color": self.style["colors"][self.count % len(self.style["colors"])],
            "label": label,
            "alpha": self.style["alpha"],
        }
        if scatter:
            kwargs["s"] = self.style["marker"]
        if color:
            kwargs["color"] = color
        if alpha:
            kwargs["color"] = alpha
        if marker:
            kwargs["color"] = color

        (self.ax.scatter if scatter else self.ax.plot)(time, series, **kwargs)
        self.count += 1

    def coverage(self, timestamps, color=None, bins=366):
        # type: (list, str, int) -> None
        """
        Render histogram of calendar coverage
        """
        self.ax.hist(
            timestamps,
            bins=arange(bins + 1),
            facecolor=color if color else self.style["contrast"],
        )

    def frequency(self, datastream, bins: int = 10, **kwargs):
        """
        render histogram of value distribution
        """
        if isinstance(datastream, tuple):
            x = datastream
            datastream = hstack(datastream)
        else:
            x = tuple(filter(lambda ob: not isnan(ob), datastream))

        lower = kwargs.get("lower", min(datastream))
        span = kwargs.get("upper", max(datastream)) - lower

        self.ax.hist(
            x=x,
            bins=tuple(span * arange(bins + 1) / bins - lower),
            facecolor=kwargs.get("color", self.style["contrast"]),
        )

    def push(
        self,
        ylab: str = None,
        yloc: int or float = 10,
        xlab: str = "Date",
        xloc: int or float = 30,
        legend: bool = True,
        title: str = None,
        rescale: tuple = None,
    ) -> BytesIO:
        """
        Script figure file output

        Kwargs:
            filename :: full path for file output
            ylab :: Y-axis label
            yloc :: Y-axis tick placement
            geo :: is a map
        """
        self.pre_push()
        if self.extent is None:
            self.ax.autoscale()

        self.__fmt_time_axis(xlab, ticks=xloc)
        self.__fmt_y_axis(ylab, ticks=yloc)

        # self.fig.tight_layout()
        for tick in self.ax.get_xticklabels():
            tick.set_rotation(60)
        if legend:
            self.legend(loc="best", fc="none", ec="none")
        if title is not None:
            self.ax.set_title(title)

        if rescale is not None:
            y_vals = self.ax.get_yticks()
            self.ax.set_yticklabels((int(ceil(v * rescale[0])) for v in y_vals))

        return super().push(
            edgecolor=self.style["bg"],
            dpi=self.style["dpi"],
            facecolor=self.style["bg"],
        )


class Spatial(View):
    def push(self, encoding="png", transparent=False, **kwargs):
        # type: (str, bool, dict) -> BytesIO
        """
        Write figure as image to binary output buffer
        """
        self.pre_push()

        self.ax.axis("equal")
        self.ax.set_xlabel("x")
        self.ax.set_ylabel("y")
        if self.extent is not None:
            self.ax.set_xlim(*self.extent[:2])
            self.ax.set_ylim(*self.extent[2:4])
            dx = self.extent[1] - self.extent[0]
            dy = self.extent[3] - self.extent[2]
            inc = int(ceil(min((dx, dy)))) // 5

            for axis in (self.ax.xaxis, self.ax.yaxis):
                axis.set_major_formatter(FormatStrFormatter("%.01f"))
                axis.set_major_locator(MultipleLocator(inc))

        self.fig.tight_layout()

        return super().push(
            encoding,
            transparent,
            edgecolor=self.style["contrast"],
            dpi=self.style["dpi"],
            fc=[0, 0, 0, 0] if transparent else self.style["bg"],
            bbox_inches="tight",
        )

    def points(self, xy, **kwargs):
        # type: (array, dict) -> None
        """
        Add collection of identical points to figure axis
        """
        self.ax.scatter(
            xy[:, 0],
            xy[:, 1],
            s=kwargs.get("marker", self.style["marker"]),
            color=kwargs.get("color", self.style["flag"]),
            alpha=kwargs.get("alpha", self.style["alpha"]),
            label=kwargs.get("label", self.style["label"]),
        )

    def bbox(self, ext, **kwargs):
        """
        Add extent as styled Polygon
        """
        e = ext
        xy = array([[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]])
        self.shape(xy=xy, **kwargs)

    def shape(self, xy, **kwargs):
        # type: (array, dict) -> None
        """
        Add shape to figure axis
        """
        patch = Polygon(xy, **kwargs)
        self.ax.add_patch(patch)  # add polygon to figure

    def topology(
        self,
        vertex_array,
        topology,
        z,
        cmap="binary_r",
        shading="gouraud",
        edgecolor="none",
        **kwargs,
    ):
        # type: (array, array, array, str, str, str, dict) -> None
        """
        Add triangular mesh to figure axis
        """

        self.ax.tripcolor(
            *vertex_array,
            topology,
            z,
            cmap=cmap,
            shading=shading,
            edgecolor=edgecolor,
            vmin=z.min(),
            vmax=z.max(),
            **kwargs,
        )



def _loc(s: int, view: str, mx_x=None, mn_x=None, x=None):

    assert (mx_x is not None and mn_x is not None) or x is not None
    if x is not None:
        mx_x = max(x)
        mn_x = min(x)
    if view == "coverage":
        return int(mx_x - mn_x) / 10
    span = mx_x - mn_x
    dx = span / s
    return dx if span < 3 else int(ceil(dx))

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


def extract_json_series(client, objectKey, processes=1):
    # type: (Storage, str, int) -> [dict]
    data = client.get(objectKey)
    pool = Pool(processes=processes)
    return pool.starmap(consume, (load_json(data).get("data"),))


def datastreams(body, client, view="scatter", **kwargs):
    # type: (dict, Storage, str, dict) -> bytes

    labels = body.get("labels", {})
    view_extent = body.get("extent", None)
    data = body.get("data")
    objectKey = data.get("objectKey")
    if objectKey:
        pool = Pool(processes=1)
        _data = pool.starmap(consume, (load_json(client.get(objectKey)).get("data"),))
        _data = extract_json_series(client, objectKey)[0]
        data = [[_data["time"], _data["weight"]]]
        unwind = False
    else:
        unwind = True

    style = apply_style(conf=app.app.config, declared=body.get("style", {}))
    figure = Time(style=style, extent=view_extent)
    data_extent = None
    if view in {"series", "scatter"}:
        for dataset, label in zip(data, labels.get(view, [None])):
            _extent = apply_series(
                dataset, figure, label=label, scatter=(view == "scatter"), unwind=unwind
            )
            data_extent = update_extent(_extent, data_extent)
        xloc = _loc(10, view, mn_x=data_extent[0], mx_x=data_extent[2])
        yloc = _loc(5, view, mn_x=data_extent[1], mx_x=data_extent[3])
    else:
        x, y = zip(*data[0])
        if view == "coverage":
            figure.coverage(x, bins=20)
        elif view == "frequency":
            figure.frequency(y, bins=10)
        else:
            return "Bad request", 400
        xloc = _loc(10, view, x=x)
        yloc = _loc(5, view, x=y)

    return figure.push(
        legend=figure.style["legend"],
        xloc=xloc,
        yloc=yloc,
        xlab=labels.get("x", "Time"),
        ylab=labels.get("y", None),
    ).getvalue()


def locations(body: dict, **kwargs):

    style = apply_style(conf=app.app.config, declared=body.get("style", {}))
    view = Spatial(style=style, extent=body.get("extent", None))

    for image, extent in body.get("images", ((), ())):
        view.ax.imshow(image, extent=extent, interpolation=style["imageInterp"])
    for s in body.get("shapes", ()):
        view.shape(s, edge="black", face="none")
    for p in body.get("points", ()):
        view.points(p)
    return view.push()


def handle(req):
    """handle a request to the function
    Args:
        req (str): request body
    """

    return req
