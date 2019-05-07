from connexion import request
from .. import sensing
from .. import catalog
from bathysphere_graph.graph import Organizations
from bathysphere_graph.sensing import *
from bathysphere_graph.catalog import *
from bathysphere_graph.mesh import Mesh, Cells, Nodes
from bathysphere_graph.tasking import TaskingCapabilities, Tasks, Actuators
from .utils import graph_context
from ..secrets import SERVICE, PORT


@graph_context
def get_sets(extension: str):
    """
    Usage 1. Get references to all entity sets
    """
    if extension == "sensing":
        models = sensing.entities
    elif extension == "catalog":
        models = catalog.models
    elif extension == "mesh":
        models = (Mesh, Cells, Nodes)
    elif extension == "tasking":
        models = (TaskingCapabilities, Tasks, Actuators)
    else:
        return 405

    message = {"value": [{"name": each.__name__, "url": "http://"+SERVICE+":"+str(PORT)+"/"+each.__name__} for each in models]}
    return message, 200


@graph_context
def link(parent_cls, parent_id, child_cls, child_id):

    root = request.graph.load(parent_cls, parent_id)
    child = request.graph.load(child_cls, child_id)
    request.graph.link(root, children=child)
    return 204


@graph_context
def update_collection(entity):

    data = request.get_json()
    index_by = data.get("indexBy", None)
    if index_by is not None:
        request.graph.index(entity, index_by)

    label = data.get("label", None)
    if label is not None:
        request.graph.label(entity, label, None)

    return 204


@graph_context
def get_all(entity):
    """Usage 2. Get all entities of a single class"""
    nn, entities = request.graph._check_and_load(entity, service=SERVICE)
    return {"@iot.count": str(nn), "value": entities}, 200


@graph_context
def get_by_id(entity, id, key=None, method=None):
    """
    Usage 3. Return information on a single entity
    Usage 4. Return single entity property
    Usage 5. Return the value of single property of the entity
    """

    entities = request.graph.render(entity, identity=id)

    if len(entities) != 1:
        return {"error": "duplicate entries found"}, 500

    if key is not None:
        value = entities[0][key]
        return {
            {"value": value} if method == "$value" else
            {key: value}
        }, 200

    return {
        "@iot.count": str(len(entities)),
        "value": tuple(item._serialize(service=SERVICE) for item in entities)
    }, 200


@graph_context
def get_recursive(entity, id, child, method):
    """
    Usage 6. Return instances of other associated type
    Usage 7. Return all links to other type associated with this entity
    Usage 8. Return all entity or value of associated entity - Not implemented
    """
    # expansion = _check_for_arg(request, "$expand")
    # select = _check_for_arg(request, "$select")

    try:
        nn, entities = request.graph.children(entity, SERVICE, id, child)
        return {
            "@iot.count": str(nn),
            "value": [e["@iot.selfLink"] for e in entities] if method == "$ref" else entities
        }, 200

    except KeyError:
        return {'error': 'Bad request'}, 405


@graph_context
def create(entity, body, offset=0):
    """
    Attach to db, and find available ID number to register the entity
    """
    cls = body.pop("entityClass")  # only used for API discriminator
    if entity != cls:
        return {'error': 'Bad request'}, 405

    obj = eval(entity)(**{
        **{
            "identity": request.graph.auto_id(entity, offset=offset),
            "graph": request.graph,
        },
        **body
    })

    return {"message": "Create "+cls, "value": obj._serialize(service=SERVICE)}, 200


@graph_context
def delete(entity, id):
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    return {"message": "Delete an entity"}, 501


@graph_context
def update(entity, id):
    """
    Give new values for the properties of an existing entity.
    """
    return {"message": "Update an entity. Requires JSON to be submitted."}, 501



