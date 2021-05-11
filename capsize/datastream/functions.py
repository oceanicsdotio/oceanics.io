from datetime import datetime


def render(body: dict):
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
