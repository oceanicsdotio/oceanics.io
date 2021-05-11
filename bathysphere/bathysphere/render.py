# pylint: disable=redefined-builtin,invalid-name,wrong-import-position,arguments-differ
"""
Image module models encapulate methods for visualing spatiotemporal data.
"""
from __future__ import annotations
from io import BytesIO
from typing import Any
from datetime import datetime

from matplotlib import use
use("agg")  # this has to come first
from yaml import load, Loader
from matplotlib.ticker import MultipleLocator, FormatStrFormatter
from numpy import array, arange, max, min

DEFAULT_STYLES = load(open("config/render-styles.yml"), Loader)

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
        from matplotlib.pyplot import subplots, subplots_adjust
        from matplotlib import rc

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
    """
    Special case of view for time series data
    """

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
        from matplotlib.dates import DateFormatter, MonthLocator, DayLocator

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
        from numpy import ceil

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
        """
        Image of spatial entities. Two formats are accepted. 
        
        Points and Polygons must be given in GeoJSON formats. 
        These are enclosed as a list of Features withing a
        FeatureCollection. 
        
        Raster images, which may be remote sensing data, or actual images,
        are given as external references or hex strings (future). 

        Images are drawn first, then polygons, then points. 
        
        """
        from itertools import repeat
        from matplotlib.patches import Polygon

        collection = data.get("FeatureCollection", None)
        images = data.get("Images", ())

        if images:
            def composite(imageTuple):
                image, extent = imageTuple
                self.ax.imshow(
                    image, extent=extent, interpolation=self.style["imageInterp"]
                )
            _ = tuple(map(composite, images))

        if collection:
            features = collection["features"]
            _ = tuple(
                map(
                    lambda xy, kwargs: self.ax.add_patch(Polygon(xy.geometry["coordinates"], **kwargs)),
                    filter(lambda x: x.geometry["type"] == "Polygon", features),
                    repeat({"edgecolor": "black", "facecolor": "none"}),
                )
            )

            _ = tuple(
                map(
                    self.points, 
                    filter(lambda x: x.geometry["type"] == "Point", features)
                )
            )
    
        return self


        from datetime import datetime


def datastream(body: dict):
    """
    Handle a request to the function
    """
    from numpy import arange
    from flask import send_file
    from itertools import repeat, chain

    from capsize.render import Time, DEFAULT_STYLES


    extent = body.get("extent", [])
    artifact = body.get("artifact", "preview")
    labels = body.get("labels", dict())
    view = body.get("view")
    series = body.get("data").get("DataStreams")
    style = body.get("style", dict())

    style = {
        **DEFAULT_STYLES["base"],
        **DEFAULT_STYLES[style.pop("template", "dark")],
        **style
    }

    fig = Time(style=style, extent=extent)
   
    if view == "coverage":
        t, _ = zip(*chain(*series))
        bins = 20

        fig.ax.hist(
            t,
            bins=arange(bins + 1),
            facecolor=fig.style["contrast"],
        )

        xloc, yloc = int(max(t) - min(t)) // 6, len(t) // bins // 2

    elif view == "frequency":

        from numpy import hstack, isnan

        _, y = zip(*chain(*series))  # chain all values together
        bins = 10

        datastream = hstack(filter(lambda ob: not isnan(ob), y))

        lower = datastream.min()
        upper = datastream.max()
        span = upper - lower

        fig.ax.hist(
            x=datastream,
            bins=tuple(span * arange(bins + 1) / bins - lower),
            facecolor=fig.style["contrast"],
        )
        
        xloc, yloc = int(span) // 6, len(y) // bins // 2

    elif view == "series":
       
        for dataset, label in zip(series, labels or repeat("none")):
            try:
                x, y = zip(*dataset)
            except ValueError:
                return {
                    "detail": f"Invalid shape of Datastreams: {len(dataset)}, {len(dataset[0])}, {len(dataset[0][0])}"
                }, 400

            fig.plot(x, y, label=label, scatter=True)
            new = [min(x), max(x), min(y), max(y)]
            extent = extent or new.copy()

            for ii in range(0, len(new) // 2, 2):
                b = ii + 1
                extent[ii] = min((extent[ii], new[ii]))
                extent[b] = max((extent[b], new[b]))

        xloc, yloc = (30, 5) if extent else (None, None)
    

    image_buffer = fig.push(
        legend=fig.style["legend"],
        xloc=xloc,
        yloc=yloc,
        xlab=labels.pop("x", "Time"),
        ylab=labels.pop("y", None),
    )
    
    return send_file(
        image_buffer,
        mimetype='image/png',
        as_attachment=True,
        attachment_filename=f'{artifact}.png'
    )


def fourierTransform(
    body,
    dt: float = 1, 
    lowpass: float = None, 
    highpass: float = None, 
    fill: bool = False, 
    compress: bool = True
):
    """
    Perform frequency-domain filtering on regularly spaced time series
    
    Kwargs:
    
        tt, float[] :: time series
        yy, float[] :: reference series
        dt, float :: regular timestep
        lowpass, float :: lower cutoff
        highpass, float :: upper cutoff
    """
    from scipy.fftpack import irfft
    
    series = tuple(item.value for item in body)
    spectrum, _ = frequencySpectrum(
        series, dt=dt, fill=fill, compress=compress
    )

    freq = spectrum["frequency"]
    ww = spectrum["index"]

    if highpass is not None:
        mask = ww < highpass
        freq[mask] = 0.0  # zero out low frequency

    if lowpass is not None:
        mask = ww > lowpass
        freq[mask] = 0.0  # zero out high-frequency

    filtered = irfft(freq)

    return {"series": filtered}, 200


def frequencySpectrum(
    body, 
    dt: float = 1, 
    fill: bool = False, 
    compress: bool = True
) -> (dict, int):

    from scipy.fftpack import fftfreq, rfft
    from numpy import array

    series = array(tuple(item.value for item in body))

    if fill:
        series = series.ffill()  # forward-fill missing values

    index = fftfreq(len(series), d=dt)  # frequency indices
    freq = rfft(series)  # transform to frequency domain
    if compress:
        mask = index < 0.0
        freq[mask] = 0.0  # get rid of negative symmetry

    return {"frequency": freq, "index": index}, 200


def smoothUsingConvolution(
    body: list,
    bandwidth: float
):
    """
    Smooth an evenly-spaced time series using a square unit function
    kernel. 
    
    The output of `resampleSparseSeries` is guarenteed to be a
    compatible input to the body arguement of this function. 
    """
    from numpy import convolve, ones

    series = tuple(item.value for item in body)
    filtered = convolve(series, ones((bandwidth,)) / bandwidth, mode="same")
    return {"series": filtered}, 200



from __future__ import annotations
import attr
from attr import Factory
from sklearn.neighbors import KernelDensity
from itertools import repeat, chain
from flask import send_file
from yaml import load, Loader

from capsize.render import Spatial, DEFAULT_STYLES


MODEL: KernelDensity = None

def render(
    body: dict,
    artifact: str = "preview",
    labels: dict = None,
    style: dict = None,
    extent: dict = None
):
    """
    Handle a request to the function
    """
    data = body.get("data")
    style = body.get("style")
   
    image_buffer = Spatial(
        style={
            **DEFAULT_STYLES["base"],
            **DEFAULT_STYLES[style.pop("template", "dark")],
            **style
        }, 
        extent=extent
    ).draw(data).push()
    
    return send_file(
        image_buffer,
        mimetype='image/png',
        as_attachment=True,
        attachment_filename=f'{artifact}.png'
    )


def train(
    target: iter, 
    field: object, 
    xx: iter, 
    yy: iter
):
    """
    Train kernel density estimator model using a quantized mesh

    :param mesh: Mesh object of the Interpolator super type
    :param key: Spatial field to train on
    :return:
    """
    from numpy import isnan, where, hstack

    model = MODEL or KernelDensity()

    # mark non-NaN values to retain
    subset, _ = where(~isnan(target.data))  
    
    # train estimator
    model.fit(hstack((xx[subset], yy[subset], target[subset])))  
    return model.score_samples(field)


def predict(
    extent, 
    count, 
    view, 
    native, 
    xin, 
    yin, 
    bandwidth=1000
):
    """
    Predict new locations based on trained model
    """

    from numpy import array
    from pyproj import transform

    if MODEL is None:
        return "No trained model", 404
    
    xnew = []
    ynew = []

    def prohibit():
        """ Strict local inhibition """
        xtemp = array(xin + xnew)
        ytemp = array(yin + ynew)
        dxy = ((xtemp - xx) ** 2 + (ytemp - yy) ** 2) ** 0.5
        nearest = dxy.min()
        return nearest < 0.5 * bandwidth

    xmin, ymin = transform(view, native, *extent[0:2])
    xmax, ymax = transform(view, native, *extent[2:4])

    total = 0
    passes = 0
    while total < count and passes < count * 10:

        sample = MODEL.sample()
        xx = sample[0][0]
        yy = sample[0][1]

        if (xmax > xx > xmin) and (ymax > yy > ymin):  # particle is in window

            if bandwidth is not None and prohibit():
                xnew.append(xx)
                ynew.append(yy)
                total += 1
            else:
                passes += 1