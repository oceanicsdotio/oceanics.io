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