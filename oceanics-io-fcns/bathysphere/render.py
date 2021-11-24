
# @context
# def render_data_stream(body: dict):
#     """
#     Handle a request to the function
#     """
#     # This has to come before other calls to matplotlib, Agg render for PNG
#     from matplotlib import use, rc
#     use("agg")

#     # Date axes
#     from matplotlib.dates import DateFormatter, MonthLocator, DayLocator

#     # Axis formatting
#     from matplotlib.ticker import MultipleLocator, FormatStrFormatter

#     # Figure layouts
#     from matplotlib.pyplot import subplots, subplots_adjust

#     from bathysphere import DEFAULT_STYLES


#     style = FigureStyle(spec=DEFAULT_STYLES)

#     rc("text", usetex=True)
#     rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
#     rc("mathtext", default="sf")
#     rc("lines", markeredgewidth=1, linewidth=style.base.line)
#     rc("axes", labelsize=style.text, linewidth=(style.base.line + 1) // 2)
#     rc("xtick", labelsize=style.base.text)
#     rc("ytick", labelsize=style.base.text)
#     rc("xtick.major", pad=5)
#     rc("ytick.major", pad=5)

#     fig, ax = subplots(
#         facecolor=style.dark.bg,
#         figsize=(style.base.width, style.base.height)
#     )

#     subplots_adjust(
#         left=style.base.padding[0],
#         bottom=style.padding[1],
#         right=1 - style.padding[2],
#         top=1 - style.padding[3]
#     )

#     label = body.get("label")
#     count = body.get("colorId")
#     time, value = zip(*body.get("data"))

#     axes = body.get("axes")

#     x = Axis(**axes.pop("x"), interval=[min(time), max(time)])
#     y = Axis(**axes.pop("y"), interval= [min(value), max(value)])

#     ax.scatter(
#         time,
#         value,
#         color=style.dark.colors[count % len(style.dark.colors)],
#         label=label,
#         alpha=style.base.alpha,
#         s=style.base.marker,
#     )

#     fig.canvas.draw()

#     ax.set_frame_on(True)
#     ax.patch.set_facecolor(style.bg)  # background colors
#     ax.edgecolor = style.dark.contrast  # plotting area border

#     for native in (x, y):
#         _axis = getattr(ax, native.ax_attr())
#         _axis.label.set_color(style.dark.label)
#         _axis.set_major_locator(MultipleLocator(native.locator))
#         ax.tick_params(axis=native.dim, colors=style.dark.label)
#         for each in native.spines:
#             ax.spines[each].set_color(style.dark.contrast)
#         _axis.grid(style.base.grid)
#         (getattr(ax, f"set_{native.dim}lim"))(*native.interval)
#         (getattr(ax, f"set_{native.dim}label"))(*native.label)

#     for tick in ax.get_xticklabels():
#         tick.set_rotation(60)

#     legend = ax.legend(loc="best")
#     frame = legend.get_frame()
#     frame.set_facecolor("none")
#     frame.set_edgecolor("none")
#     for text in legend.get_texts():
#         text.set_color(style.dark.contrast)

#     buffer = BytesIO()
#     fig.savefig(
#         buffer,
#         format="png",
#         transparent=False,
#         edgecolor=style.palette.bg,
#         dpi=style.base.dpi,
#         facecolor=style.palette.bg
#     )
#     buffer.seek(0)

#     return send_file(
#         buffer,
#         mimetype='image/png',
#         as_attachment=True,
#         attachment_filename=f'preview.png'
#     )


# @context
# def fast_fourier_transform(body, dt, highpass, lowpass):
#     # typing: (list, float, float, float) -> (dict, int)
#     """
#     Perform frequency-domain filtering on regularly spaced time series

#     Create and truncate the frequency spectrum of the signal,
#     and return bins.
#     """

#     # Numerical methods for fast Fourier transform and the inverse
#     from scipy.fftpack import fftfreq, rfft, irfft

#     # Need array for forward-fill methods
#     from numpy import array

#     # Transform to the frequency domain
#     frequency = rfft(body)

#     # Calculate frequency indices
#     index = fftfreq(len(body), d=dt)

#     # Calculate mask for compression
#     mask = index < max(0, highpass) | index > lowpass

#     # Zero out masked area
#     frequency[mask] = 0.0

#     # Reconstitute and send
#     return {"series": list(irfft(frequency))}, 200


# @context
# def convolve_smooth(body, bandwidth, mode="same"):
#     # typing: (list, ) -> (dict, int)
#     """
#     Smooth an evenly-spaced time series using a square unit function
#     kernel.

#     The output of `resampleSparseSeries` is guaranteed to be a
#     compatible input to the body argument of this function.
#     """
#     # Method and kernel
#     from numpy import convolve, ones

#     # Create the series iterable
#     series = map(lambda x: x.value, body)

#     return {
#         "value": convolve(series, ones((bandwidth,)) / bandwidth, mode=mode)
#     }, 200


# @context
# def spatial(body):
#     # typing: (dict) -> (Type)
#     """
#     Handle a request for a graphical representation of spatial assets.

#     Usually considered to be a single moment in time, but not necessarily. 

#     Two formats are accepted.
        
#     Points and Polygons must be given in GeoJSON formats. 
#     These are enclosed as a list of Features withing a
#     FeatureCollection. 
    
#     Raster images, which may be remote sensing data, or actual images,
#     are given as external references. 

#     Images are drawn first, then polygons, then points. 
#     """
   
#     # This has to come before other calls to matplotlib, Agg render for PNG
#     from matplotlib import use, rc
#     use("agg")

#     # Axis formatting
#     from matplotlib.ticker import MultipleLocator, FormatStrFormatter

#     # Drawing shapes
#     from matplotlib.patches import Polygon

#     # Figure layouts
#     from matplotlib.pyplot import subplots, subplots_adjust

    
#     style = FigureStyle(spec=body.get("style"))
   
#     rc("text", usetex=True)
#     # rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
#     rc("mathtext", default="sf")
#     rc("lines", markeredgewidth=1, linewidth=style.line)
#     rc("axes", labelsize=style.text, linewidth=(style.line + 1) // 2)
#     rc("xtick", labelsize=style.text)
#     rc("ytick", labelsize=style.text)
#     rc("xtick.major", pad=5)
#     rc("ytick.major", pad=5)

#     fig, ax = subplots(
#         facecolor=style.bg,
#         figsize=(style.width, style.height)
#     )
    
#     subplots_adjust(
#         left=style.padding[0],
#         bottom=style.padding[1],
#         right=1 - style.padding[2],
#         top=1 - style.padding[3]
#     )

#     image_buffer = Spatial(
#         style={
#             **DEFAULT_STYLES["base"],
#             **DEFAULT_STYLES[style.pop("template", "dark")],
#             **style
#         },
#         extent=extent
#     ).draw(body.get("data")).push()

#     def format_axis(ax, dim, style):
#         # typing: (Type, str, dict) -> None
#         """
#         Style the plotting area
#         """

#         native = Axis(dim=dim.lower())

#         _axis = getattr(ax, native.ax_attr())

#         _axis.label.set_color(style.dark.label)

#         ax.tick_params(axis=native.dim, colors=style.dark.label)
#         for each in native.spines:
#             ax.spines[each].set_color(style.dark.contrast)

#         _axis.grid(style.base.grid)

    
#     collection = data.get("FeatureCollection", None)
#     images = data.get("Images", ())
    


#     def points(xy, **kwargs):
#         # type: (array, dict) -> None
#         """
#         Add collection of identical points to figure axis
#         """
#         return ax.scatter(
#             xy[:, 0],
#             xy[:, 1],
#             s=kwargs.get("marker", style["marker"]),
#             color=kwargs.get("color", style["flag"]),
#             alpha=kwargs.get("alpha", style["alpha"]),
#             label=kwargs.get("label", style["label"]),
#         )

#     def composite(imageTuple):
#         image, extent = imageTuple
#         ax.imshow(
#             image, extent=extent, interpolation=style["imageInterp"]
#         )


#     def draw(self, data):
#         # typing: (Spatial, dict) -> Spatial
        
        

#         _ = tuple(map(composite, images))

#         if collection:
#             features = collection["features"]
#             _ = tuple(
#                 map(
#                     lambda xy, kwargs: ax.add_patch(Polygon(xy.geometry["coordinates"], **kwargs)),
#                     filter(lambda x: x.geometry["type"] == "Polygon", features),
#                     repeat({"edgecolor": "black", "facecolor": "none"}),
#                 )
#             )

#             _ = tuple(
#                 map(
#                     points, 
#                     filter(lambda x: x.geometry["type"] == "Point", features)
#                 )
#             )



#     def push(self, encoding="png", transparent=False, **kwargs):
#         # type: (str, bool, dict) -> BytesIO
#         """
#         Write figure as bathysphere_functions_image to binary output buffer
#         """
#         fig.canvas.draw()
#         contrast = style.pop("contrast")
#         bg = style.pop("bg")

#         ax.patch.set_facecolor(bg)  # background colors
#         ax.edgecolor = contrast  # plotting area border

#  for dim in ("x", "y"):
#         native = Axis(dim=dim)

#         _axis = getattr(ax, native.ax_attr())
#         _axis.label.set_color(style.dark.label)
#         ax.tick_params(axis=native.dim, colors=style.dark.label)
#         for each in native.spines:
#             ax.spines[each].set_color(style.dark.contrast)
#         _axis.grid(style.base.grid)
#         format_axis("x", contrast, **style)
#         format_axis("y", contrast, **style)

#         ax.set_frame_on(True)
#         ax.axis("equal")
#         ax.set_xlabel(kwargs.get("xlabel", "x"))
#         ax.set_ylabel(kwargs.get("ylabel", "y"))
#         if extent is not None:
#             ax.set_xlim(*extent[:2])
#             ax.set_ylim(*extent[2:4])
#             dx = extent[1] - extent[0]
#             dy = extent[3] - extent[2]
#             inc = min((dx, dy)) / 4
#             if inc < 1.0:
#                 inc = int(inc * 10) / 10
#             else:
#                 inc = int(inc)

#             for axis in (ax.xaxis, ax.yaxis):
#                 axis.set_major_formatter(FormatStrFormatter("%.01f"))
#                 axis.set_major_locator(MultipleLocator(inc))

#         fig.tight_layout()

#         buffer = BytesIO()
#         fig.savefig(
#             buffer, 
#             format="png", 
#             transparent=style.base.transparent, 
#             edgecolor=style.dark.contrast,
#             dpi=style["dpi"],
#             fc=[0, 0, 0, 0] if transparent else style["bg"],
#             bbox_inches="tight"
#         )
#         buffer.seek(0)
#         return buffer

#     return send_file(
#         image_buffer,
#         mimetype='image/png',
#         as_attachment=True,
#         attachment_filename=f'preview.png'
#     )
