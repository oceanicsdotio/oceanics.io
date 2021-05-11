# pylint: disable=line-too-long,too-many-lines,invalid-name
"""
The functions module of the graph API contains handlers for secure
calls.

These are exposed as a web service.
"""
# Time stamp conversion
from datetime import datetime, date, timedelta  # pylint: disable=unused-import

# pick up runtime vars from environment
from os import getenv

# JSON serialization
from json import dumps, loads, decoder, load  # pylint: disable=unused-import

# enable backend parallel processing if available
from multiprocessing import Pool, cpu_count  # pylint: disable=unused-import

# singleton forcing conditions
from itertools import repeat  # pylint: disable=unused-import

# peek into wrapped function signatures, to conditionally inject args
from inspect import signature

# for creating users and other entities
from uuid import uuid4

# function signature of `context`
from typing import Callable, Type, Any, Iterable  # pylint: disable=unused-import

# function signature for db queries
from neo4j import Driver, Record, GraphDatabase  # pylint: disable=unused-import

# point conversion and type checking
from neo4j.spatial import WGS84Point  # pylint: disable=import-error,no-name-in-module

# Object storage
from minio import Minio

# Object storage errors
from minio.error import S3Error  # pylint: disable=no-name-in-module,unused-import

# password authentication
from passlib.apps import custom_app_context

# JWT authentication
from itsdangerous import TimedJSONWebSignatureSerializer

# use when handling decode errors
from itsdangerous.exc import BadSignature

# headers and such available for authenticate.
from flask import request, send_file

# Native implementations from Rust code base
from bathysphere.bathysphere import (  # pylint: disable=no-name-in-module, unused-import
    Links,
    Node,
    Assets,
    Actuators,
    DataStreams,
    Observations,
    Things,
    Sensors,
    Tasks,
    TaskingCapabilities,
    ObservedProperties,
    FeaturesOfInterest,
    Locations,
    HistoricalLocations,
    User,
    Providers,
    MetaDataTemplate,
    Axis,
    FigurePalette,
    FigureStyle
)


def parse_as_cypher(props: dict) -> str:
    """
    Generate cypher from dict
    """

    def _parse(keyValue: (str, Any)) -> str or None:
        """
        Convert a String key and Any value into a Cypher representation
        for making the graph query.
        """
        key, value = keyValue

        if "location" in key and isinstance(value, dict) and value.get("type") == "Point":

            coord = value["coordinates"]
            if len(coord) == 2:
                values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"
            elif len(coord) == 3:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            else:
                return None
            return f"{key}: point({{{values}}})"

        if isinstance(value, (list, tuple, dict)):
            return f"{key}: '{dumps(value)}'"

        if isinstance(value, str) and value and value[0] == "$":
            # This hardcoding is bad, but the $ picks up credentials
            if len(value) < 64:
                return f"{key}: {value}"

        if value is not None:
            return f"{key}: {dumps(value)}"

        return None


    return ", ".join(filter(lambda x: x is not None, map(_parse, props.items())))


def parse_as_nodes(nodes):
    # typing: (Iterable) -> Iterable
    """
    Convert from Entity Model representation to Cypher node pattern
    """
    def _parse(item):
        """Mapped operation"""
        ii, value = item
        Node(pattern=parse_as_cypher(value), symbol=f"n{ii}", label=type(value).__name__)

    return map(_parse, enumerate(nodes))


def load_node(entity, db):
    # typing: (Type, Driver) -> [Type]
    """
    Create entity instance from a Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """
    def _parse(keyValue: (str, Any),) -> (str, Any):

        k, v = keyValue

        if isinstance(v, WGS84Point):
            return k, {
                "type": "Point",
                "coordinates": f"{[v.longitude, v.latitude]}"
            }

        return k, v

    cypher = next(parse_as_nodes(entity)).load()

    items = []
    with db.session() as session:
        for record in session.read_transaction(lambda tx: tx.run(cypher.query)):
            props = dict(map(_parse, dict(record[0]).items()))
            items.append(type(entity)(**props))

    return items



def context(fcn):
    # typing: (Callable) -> (Callable)
    """
    Decorator to authenticate and inject user into request.

    Validate/verify JWT token.
    """

    # Enable more specific HTTP error messages for debugging.
    DEBUG = True

    def _wrapper(**kwargs):
        # typing: (dict) -> (dict, int)
        """
        The produced decorator
        """
        try:
            db = GraphDatabase.driver(
                uri=getenv("NEO4J_HOSTNAME"),
                auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
            )
        except Exception:  # pylint: disable=broad-except
            return ({"Error": "No graph backend"}, 500)

        username, password = request.headers.get("authorization", ":").split(":")

        if username and "@" in username:  # Basic Auth
            accounts = load_node(User(name=username), db)
            user = accounts.pop() if len(accounts) == 1 else None

            if user is None or not custom_app_context.verify(password, user.credential):
                return {"message": "Invalid username or password"}, 403

        else: # Bearer Token
            secretKey = request.headers.get("x-api-key", "salt")
            try:
                decoded = TimedJSONWebSignatureSerializer(secretKey).loads(password)
            except BadSignature:
                return {"Error": "Missing authorization and/or x-api-key headers"}, 403
            uuid = decoded["uuid"]
            accounts = load_node(User(uuid=uuid), db)
            candidates = len(accounts)
            if candidates != 1:
                return {
                    "Message": f"There are {candidates} accounts matching UUID {uuid}"
                }, 403
            user = accounts.pop()

        provider = load_node(Providers(domain=user.name.split("@").pop()), db)
        if len(provider) != 1:
            raise ValueError

        # inject the provider, if contained in the function signature
        if "provider" in signature(fcn).parameters.keys():
            kwargs["provider"] = provider.pop()

        # inject the user, if contained in function signature
        if "user" in signature(fcn).parameters.keys():
            kwargs["user"] = user

        # inject object storage client
        if "s3" in signature(fcn).parameters.keys():
            kwargs["s3"] = Minio(
                endpoint=getenv("STORAGE_ENDPOINT"),
                secure=True,
                access_key=getenv("SPACES_ACCESS_KEY"),
                secret_key=getenv("SPACES_SECRET_KEY"),
            )

        try:
            return fcn(db=db, **kwargs)
        except TypeError as ex:
            return {
                "message": "Bad inputs passed to API function",
                "detail": f"{ex}"
            }, 400

    def handleUncaughtExceptions(**kwargs):
        """
        Utility function
        """
        try:
            return _wrapper(**kwargs)
        except Exception:  # pylint: disable=broad-except
            return {"message": "Unhandled error"}, 500

    return _wrapper if DEBUG else handleUncaughtExceptions


def register(body):
    # typing: (dict) -> (dict, int)
    """
    Register a new user account
    """
    # pylint: disable=too-many-return-statements
    try:
        db = GraphDatabase.driver(
            uri=getenv("NEO4J_HOSTNAME"),
            auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
        )
    except Exception:  # pylint: disable=broad-except
        return ({"message": "No graph backend"}, 500)

    apiKey = request.headers.get("x-api-key") or body.get("apiKey")
    if not apiKey:
        message = (
            "Registration requires a valid value supplied as the `x-api-key` "
            "or `apiKey` in the request body. This is used to associate your "
            "account with a public or private ingress."
        )
        return {"message": message}, 403

    providers = load_node(Providers(apiKey=apiKey), db)
    if len(providers) != 1:
        return {"message": "Bad API key."}, 403

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    _, domain = username.split("@")

    if load_node(User(name=username), db):
        return {"message": "invalid email"}, 403

    entryPoint = providers.pop()
    if entryPoint.name != "Public" and domain != entryPoint.domain:
        message = (
            "You are attempting to register with a private Provider "
            "without a matching e-mail address. Contact your "
            "account administrator for access."
        )
        return {"message": message}, 403

    _hash = custom_app_context.hash(body.get("password"))

    user = User(
        name=username,
        uuid=uuid4().hex,
        credential=_hash,
        ip=request.remote_addr,
    )

    cypher = next(parse_as_nodes((user,))).create()

    # establish provenance
    nodes = parse_as_nodes((user, entryPoint))
    link_cypher = Links(label="Register", rank=0).join(*nodes)

    try:
        with db.session() as session:
            session.write_transaction(lambda tx: tx.run(cypher.query))
            session.write_transaction(lambda tx: tx.run(link_cypher.query))
    except Exception:  # pylint: disable=broad-except
        return {"message": "linking problem"}, 500

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db, user, body) -> (dict, int):
    # typing: (Driver, User, dict) -> (dict, int)
    """
    Change account settings. You can only delete a user or change the
    alias.
    """
    # Unpack first member of Nodes tuple
    cypher = next(parse_as_nodes((user,))).mutate(parse_as_cypher(body))

    # Execute the query
    with db.session() as session:
        return session.write_transaction(cypher.query)

    # Report success
    return None, 204


@context
def token(user, provider, secretKey="salt"):
    # typing: (User, Providers, str) -> (dict, int)
    """
    Send a JavaScript Web Token back to authorize future sessions
    """

    # create the secure serializer instance and make a token
    _token = TimedJSONWebSignatureSerializer(
        secret_key=secretKey,
        expires_in=provider.tokenDuration
    ).dumps({
        "uuid": user.uuid
    }).decode("ascii")

    # send token info with the expiration
    return {"token": _token, "duration": provider.tokenDuration}, 200


@context
def catalog(db):
    # typing: (Driver) -> (dict, int)
    """
    SensorThings capability #1

    Get references to all ontological entity sets.

    Uses the graph `context` decorator to obtain the neo4j driver
    and the pre-authorized user.

    We make sure to remove the metadata entities that are not
    part of a public specification.
    """
    # format the link
    def _format(item: Record) -> dict:
        """
        Format link
        """
        return {
            "name": item["label"],
            "url": f'''${getenv("SERVICE_NAME")}/api/{item["label"]}'''
        }

    # compose the query
    cypher = Node.all_labels()

    # query and evaluate the generator chain
    with db.session() as session:
        result = session.read_transaction(lambda tx: tx.run(cypher.query))

    return {"value": [*map(_format, result)]}, 200


@context
def collection(db, entity):
    # typing: (Driver, str) -> (dict, int)
    """
    SensorThings API capability #2

    Get all entities of a single type.
    """
    # produce the serialized entity records
    # pylint: disable=eval-used
    value = [*map(lambda x: x.serialize(), load_node(eval(entity)(), db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def create(db, entity, body, provider) -> (dict, int):
    # typing: (Driver, str, dict, Providers) -> (dict, int)
    """
    Create a new node(s) in graph.

    Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    The bind tuple items are external methods that are bound as instance methods to allow
    for extending capabilities in an ad hoc way.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)

    Writing transactions are recursive, and can take a long time if the tasking graph
    has not yet been built. For this reason it is desirable to populate the graph
    with at least one instance of each data type.
    """
    # Only used for API discriminator
    _ = body.pop("entityClass")

    # Evaluate str representation, create a DB record
    _entity = eval(entity)(**body)  # pylint: disable=eval-used

    # Generate query for creating the Node
    cypher = next(parse_as_nodes((_entity,))).create()

    # Establish provenance
    link_cypher = Links(
        label="Create"
    ).join(
        *parse_as_nodes((provider, _entity))
    )

    # Execute the query
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))
        session.write_transaction(lambda tx: tx.run(link_cypher.query))

    # Report success
    return None, 204


@context
def mutate(body, db, entity, uuid):
    # typing: (dict, Driver, str, str) -> (None, int)
    """
    Give new values for the properties of an existing entity.
    """

    _ = body.pop("entityClass")  # only used for API discriminator
    e = eval(entity)(uuid=uuid)  # pylint: disable=eval-used

    cypher = next(parse_as_nodes((e, ))).mutate(parse_as_cypher(body))

    with db.session() as session:
        return session.write_transaction(cypher.query)

    return None, 204


@context
def metadata(db, entity, uuid):
    # (Driver, str, str) -> (dict, int)
    """
    Format the entity metadata response.
    """
    # pylint: disable=eval-used
    value = [*map(lambda x: x.serialize(), load_node(eval(entity)(uuid=uuid), db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def query(db, root, rootId, entity):
    # (Driver, str, str, str) -> (dict, int)
    """
    Get the related entities of a certain type.
    """
    nodes = ({"cls": root, "id": rootId}, {"cls": entity})

    # Pre-calculate the Cypher query
    cypher = Links().query(*parse_as_nodes(nodes), "b")

    with db.session() as session:
        value = [*map(lambda x: x.serialize(), session.write_transaction(lambda tx: tx.run(cypher.query)))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def delete(db, entity, uuid):
    # typing: (Driver, str, str) -> (None, int)
    """
    Delete a pattern from the graph
    """
    eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
    return None, 204


@context
def join(db, root, rootId, entity, uuid, body):  # pylint: disable=too-many-arguments
    # typing: (Driver, str, str, str, str, dict) -> (None, int)
    """
    Create relationships between existing nodes.
    """

    # Generate the Cypher query
    # pylint: disable=eval-used
    cypher = Links(
        label="Join",
        **body
    ).join(
        *parse_as_nodes((
            eval(root)(uuid=rootId),
            eval(entity)(uuid=uuid)
        ))
    )

    # Execute transaction and end session before reporting success
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))

    return None, 204


@context
def drop(db, root, rootId, entity, uuid):
    # typing: (Driver, str, str, str, str) -> (None, int)
    """
    Break connections between linked nodes.
    """
    # Create the Node
    # pylint: disable=eval-used
    left, right = map(lambda xi: eval(xi[0])(uuid=xi[1]), ((root, rootId), (entity, uuid)))

    # Generate Cypher query
    cypher = Links().drop(nodes=(left, right))

    # Execute the transaction against Neo4j database
    with db.session() as session:
        return session.write_transaction(lambda tx: tx.run(cypher.query))

    # Report success
    return None, 204


@context
def render_data_stream(body: dict):
    """
    Handle a request to the function
    """
    # This has to come before other calls to matplotlib, Agg render for PNG
    from matplotlib import use, rc
    use("agg")

    # Date axes
    from matplotlib.dates import DateFormatter, MonthLocator, DayLocator

    # Axis formatting
    from matplotlib.ticker import MultipleLocator, FormatStrFormatter

    # Figure layouts
    from matplotlib.pyplot import subplots, subplots_adjust

    from bathysphere import DEFAULT_STYLES


    style = FigureStyle(spec=DEFAULT_STYLES)

    rc("text", usetex=True)
    rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
    rc("mathtext", default="sf")
    rc("lines", markeredgewidth=1, linewidth=style.base.line)
    rc("axes", labelsize=style.text, linewidth=(style.base.line + 1) // 2)
    rc("xtick", labelsize=style.base.text)
    rc("ytick", labelsize=style.base.text)
    rc("xtick.major", pad=5)
    rc("ytick.major", pad=5)

    fig, ax = subplots(
        facecolor=style.dark.bg,
        figsize=(style.base.width, style.base.height)
    )

    subplots_adjust(
        left=style.base.padding[0],
        bottom=style.padding[1],
        right=1 - style.padding[2],
        top=1 - style.padding[3]
    )

    label = body.get("label")
    count = body.get("colorId")
    time, value = zip(*body.get("data"))

    axes = body.get("axes")

    x = Axis(**axes.pop("x"), interval=[min(time), max(time)])
    y = Axis(**axes.pop("y"), interval= [min(value), max(value)])

    ax.scatter(
        time,
        value,
        color=style.dark.colors[count % len(style.dark.colors)],
        label=label,
        alpha=style.base.alpha,
        s=style.base.marker,
    )

    fig.canvas.draw()

    ax.set_frame_on(True)
    ax.patch.set_facecolor(style.bg)  # background colors
    ax.edgecolor = style.dark.contrast  # plotting area border

    for native in (x, y):
        _axis = getattr(ax, native.ax_attr())
        _axis.label.set_color(style.dark.label)
        _axis.set_major_locator(MultipleLocator(native.locator))
        ax.tick_params(axis=native.dim, colors=style.dark.label)
        for each in native.spines:
            ax.spines[each].set_color(style.dark.contrast)
        _axis.grid(style.base.grid)
        (getattr(ax, f"set_{native.dim}lim"))(*native.interval)
        (getattr(ax, f"set_{native.dim}label"))(*native.label)

    for tick in ax.get_xticklabels():
        tick.set_rotation(60)

    legend = ax.legend(loc="best")
    frame = legend.get_frame()
    frame.set_facecolor("none")
    frame.set_edgecolor("none")
    for text in legend.get_texts():
        text.set_color(style.dark.contrast)

    buffer = BytesIO()
    fig.savefig(
        buffer,
        format="png",
        transparent=False,
        edgecolor=style.palette.bg,
        dpi=style.base.dpi,
        facecolor=style.palette.bg
    )
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype='image/png',
        as_attachment=True,
        attachment_filename=f'preview.png'
    )


@context
def fast_fourier_transform(body, dt, highpass, lowpass):
    # typing: (list, float, float, float) -> (dict, int)
    """
    Perform frequency-domain filtering on regularly spaced time series

    Create and truncate the frequency spectrum of the signal,
    and return bins.
    """

    # Numerical methods for fast Fourier transform and the inverse
    from scipy.fftpack import fftfreq, rfft, irfft

    # Need array for forward-fill methods
    from numpy import array

    # Transform to the frequency domain
    frequency = rfft(body)

    # Calculate frequency indices
    index = fftfreq(len(body), d=dt)

    # Calculate mask for compression
    mask = index < max(0, highpass) | index > lowpass

    # Zero out masked area
    frequency[mask] = 0.0

    # Reconstitute and send
    return {"series": list(irfft(frequency))}, 200


@context
def convolve_smooth(body, bandwidth, mode="same"):
    # typing: (list, ) -> (dict, int)
    """
    Smooth an evenly-spaced time series using a square unit function
    kernel.

    The output of `resampleSparseSeries` is guaranteed to be a
    compatible input to the body argument of this function.
    """
    # Method and kernel
    from numpy import convolve, ones

    # Create the series iterable
    series = map(lambda x: x.value, body)

    return {
        "value": convolve(series, ones((bandwidth,)) / bandwidth, mode=mode)
    }, 200


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
