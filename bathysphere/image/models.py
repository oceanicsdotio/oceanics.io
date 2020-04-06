# pylint: disable=bad-continuation,redefined-builtin,invalid-name,wrong-import-position,arguments-differ
"""
Image module models encapulate methods for visualing spatiotemporal data.
"""
from __future__ import annotations
from io import BytesIO
from typing import Any
from datetime import datetime
from itertools import repeat

from matplotlib import use

use("agg")  # this has to come first
from matplotlib import rc
from matplotlib.pyplot import subplots, subplots_adjust
from matplotlib.ticker import MultipleLocator, FormatStrFormatter
from matplotlib.patches import Polygon
from matplotlib.dates import DateFormatter, MonthLocator, DayLocator
from numpy import (
    array,
    arange,
    ceil,
    hstack,
    isnan,
    max,
    min,
)


class View:
    """
    Views are abstract implementations of plotting contexts, which
    are extended by Spatial and Time
    """

    count = 0

    def __init__(self, style, extent=None):
        # type: (dict, (float,)) -> View
        """
        Setup and return figure and axis instances
        """
        rc("text", usetex=False)
        # rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
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
        """
        Style the plotting area
        """
        if axis.lower() == "x":
            apply = self.ax.xaxis
            spines = ("left", "right")
        elif axis.lower() == "y":
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
        """
        Convenience method for just-in-time formatting of image
        appearance before saving
        """
        self.fig.canvas.draw()
        self.format(**self.style)
        self.ax.set_frame_on(True)

    def push(
        self, encoding: str = "png", transparent: bool = False, **kwargs: dict
    ) -> BytesIO:
        """
        Create and save the file buffer
        """
        buffer = BytesIO()
        self.fig.savefig(buffer, format=encoding, transparent=transparent, **kwargs)
        buffer.seek(0)
        return buffer

    def legend(self, loc: str = "best", fc: str = "none", ec: str = "none") -> None:
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


class Time(View):
    """Special case of view for time series data"""

    def _envelope(
        self, time: array, mean: array = None, deviation: array = None, **kwargs,
    ):
        # type: (array, array, array, str, str, int) -> None
        """
        Add envelope to time series plot
        """
        return self.ax.fill_between(
            time,
            mean + deviation,
            mean - deviation,
            facecolor=kwargs.get("facecolor") or self.style["face"],
            edgecolor=kwargs.get("edgecolor") or "none",
            zorder=kwargs.get("zorder") or 3,
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
        if ticks is not None:
            if dates:
                self.ax.xaxis.set_major_locator(
                    MonthLocator() if ticks >= 30 else DayLocator()
                )

                self.ax.xaxis.set_major_formatter(
                    DateFormatter("%m/%y") if ticks >= 30 else DateFormatter("%m/%d")
                )

            else:
                self.ax.xaxis.set_major_locator(MultipleLocator(ticks))

    def __fmt_y_axis(self, label, ticks):
        # type: (Spatial, str, float) -> None
        """
        Format axes for X,Y plot similar to time series

        Kwargs:
            labs, string[] :: labels for axes
            locs, int[] :: spacing of ticks on axes
        """
        if self.extent is not None:
            self.ax.set_ylim(*self.extent[2:4])
        self.ax.set_ylabel(label)
        if ticks is not None:
            self.ax.yaxis.set_major_locator(MultipleLocator(ticks))

    def plot(
        self, time, series, label: str = "Unnamed", scatter: bool = True, **kwargs: dict
    ):
        """Draw times series as scatter plot"""
        kwargs = {
            "color": self.style["colors"][self.count % len(self.style["colors"])],
            "label": label,
            "alpha": self.style["alpha"],
            **kwargs,
        }
        if scatter:
            kwargs["s"] = self.style["marker"]

        (self.ax.scatter if scatter else self.ax.plot)(time, series, **kwargs)
        self.count += 1

    def coverage(
        self, timestamps: [datetime], color: str = None, bins: int = 366
    ) -> None:

        """
        Render histogram of calendar coverage
        """
        self.ax.hist(
            timestamps,
            bins=arange(bins + 1),
            facecolor=color if color else self.style["contrast"],
        )

    def frequency(self, datastream: Any, bins: int = 10, **kwargs: dict) -> None:
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

        return self.ax.hist(
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
    """
    Special case of View that implements mapping capabilties
    """

    def push(self, encoding="png", transparent=False, **kwargs):
        # type: (str, bool, dict) -> BytesIO
        """
        Write figure as bathysphere_functions_image to binary output buffer
        """
        self.pre_push()
        self.ax.axis("equal")
        self.ax.set_xlabel(kwargs.get("xlabel", "x"))
        self.ax.set_ylabel(kwargs.get("ylabel", "y"))
        if self.extent is not None:
            self.ax.set_xlim(*self.extent[:2])
            self.ax.set_ylim(*self.extent[2:4])
            dx = self.extent[1] - self.extent[0]
            dy = self.extent[3] - self.extent[2]
            inc = min((dx, dy)) / 4
            if inc < 1.0:
                inc = int(inc * 10) / 10
            else:
                inc = int(inc)

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
        return self.ax.scatter(
            xy[:, 0],
            xy[:, 1],
            s=kwargs.get("marker", self.style["marker"]),
            color=kwargs.get("color", self.style["flag"]),
            alpha=kwargs.get("alpha", self.style["alpha"]),
            label=kwargs.get("label", self.style["label"]),
        )

    def bbox(self, ext: array, **kwargs: dict):
        """
        Add extent as styled Polygon
        """
        e = ext
        xy = array([[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]])
        self.shape(xy, kwargs)

    def shape(self, xy: array, kwargs: dict) -> array:
        # type: (array, dict) -> Polygon
        """
        Add shape to figure axis
        """
        patch = Polygon(xy, **kwargs)
        self.ax.add_patch(patch)  # add polygon to figure
        return patch

    def topology(
        self, vertex_array: array, topology: array, z: str, **kwargs: dict,
    ) -> None:
        """
        Add triangular mesh to figure axis
        """

        self.ax.tripcolor(
            *vertex_array,
            topology,
            z,
            cmap=kwargs.pop("cmap") or "binary_r",
            shading=kwargs.pop("shading") or "gouraud",
            edgecolor=kwargs.pop("edgecolor") or "none",
            vmin=kwargs.pop("vmin") or z.min(),
            vmax=kwargs.pop("vmax") or z.max(),
            **kwargs,
        )

    def draw(
        self: Spatial, 
        data: dict
    ) -> Spatial:
        """Image of spatial entities"""
        imageHandles = []
        for image, imageExtent in data.get("images", ()):
            imageHandles.append(
                self.ax.imshow(
                    image, extent=imageExtent, interpolation=self.style["imageInterp"]
                )
            )
        shapeHandles = tuple(
            map(
                self.shape,
                data.pop("polygons", ()),
                repeat({"edgecolor": "black", "facecolor": "none"}),
            )
        )
        pointHandles = tuple(map(self.points, (array(p) for p in data.pop("points", ()))))
        if not any((imageHandles, shapeHandles, pointHandles)):
            raise ValueError("Figure contains no data")
        return self