# pylint: disable=invalid-name,
"""
Handlers for Image API. Includes `main()` routine to deploy as cloud function.
"""
from json import loads
from itertools import repeat, chain
from io import BytesIO
from flask import send_file

from numpy import array

from bathysphere import config
from bathysphere.image.models import Spatial, Time, View
from bathysphere.datatypes import ExtentType


def render(body: dict):
    """
    Handle a request to the function
    """
    style_overrides = body.pop("style", {})
    default_style = config["image"]["styles"]["base"]
    display_style = style_overrides.pop("template", "dark")

    style = {
        **default_style,
        **config["image"]["styles"][display_style],
        **style_overrides
    }

    data = body.pop("data")
    view = body.pop("view")
    labels = body.pop("labels", {})
    extent = body.pop("extent", {}).get("generic")

    if view == "spatial":
        image_buffer = Spatial(style=style, extent=extent).draw(data).push()
    else:
        fig = Time(style=style, extent=extent)
        series = data.get("DataStreams", ())

        if view == "coverage":
            t, _ = zip(*chain(*series))
            bins = 20
            fig.coverage(t, bins=bins)
            xloc, yloc = int(max(t) - min(t)) // 6, len(t) // bins // 2

        elif view == "frequency":
            _, y = zip(*chain(*series))
            bins = 10
            _ = fig.frequency(y, bins=bins)
            xloc, yloc = int(max(y) - min(y)) // 6, len(y) // bins // 2

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

                for ii in range(len(new) // 2):
                    a = ii * 2
                    b = a + 1
                    extent[a] = min((extent[a], new[a]))
                    extent[b] = max((extent[b], new[b]))

            xloc, yloc = (30, 5) if extent else (None, None)
        
        else:
            raise ValueError


    if view in {"series", "coverage", "frequency"}:
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
        attachment_filename=f'{body.pop("objectName")}.png'
    )


def main(req):
    """
    Wrapper to deploy to Google Cloud Functions
    """
    return render(loads(req.body))