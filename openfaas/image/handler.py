from json import loads as load_json
from multiprocessing import Pool
from yaml import load, Loader
from .views import extract_json_series, consume, apply_series, apply_style, Time, update_extent, _loc, Spatial

ResponseJSON = (dict, int)
ResponseOctet = (dict, int)
_styles = load(open("styles.yml"), Loader)


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
