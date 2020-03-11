from uuid import uuid4
from json import load as load_json
from functools import reduce

from neritics_bivalve import app, Storage
from neritics_bivalve.core import batch


@Storage.session(config=app.app.config)
@Storage.lock
def get_index(index: dict, **kwargs: dict) -> tuple:
    """
    Get all model configurations known to the service
    :return:
    """
    try:
        return index, 200
    except IndexError:
        return "Embedded database not found", 404


@Storage.session(config=app.app.config)
@Storage.lock
def configure(body: dict, index: dict, session: str, client: Storage):
    """
    Create a new configuration

    :param body:
    :param index: index.json data
    :param client: s3 storage connection
    :param session: UUID4 session id, used to name configuration

    :return:
    """
    metadata = body.get("metadata", dict())
    props = body.get("properties", dict())
    metadata["uid"] = session
    metadata["totalRuns"] = 0
    data = {"metadata": metadata, "properties": props, "experiments": []}

    _ = client.upload(
        label=session,
        data=data,
        metadata=client.metadata_template("configuration", headers=app.app.config["headers"]),
    )

    index["configurations"].append(session)
    _ = client.upload(
        label=app.app.config["index"],
        data=index,
        metadata=client.metadata_template("index", headers=app.app.config["headers"]),
    )
    return data, 200


@Storage.session(config=app.app.config)
@Storage.lock
def run_batch(
    objectKey: str,
    species: str,
    client: Storage,
    weight: float,
    session: str,
    body: dict = None,
    **kwargs: dict,
) -> (dict or str, int):
    """
    Run the model using a versioned configuration.

    :param objectKey: identity of the configuration to use
    :param body: optional request body with forcing
    :param species: bivalve species string, in path:
    :param session: session UUID used to name experiment
    :param weight: initial seed weight
    :param client: storage client
    """
    buffer = client.download(object_name=objectKey)
    if buffer is None:
        return "Configuration not found", 404

    config = load_json(buffer)
    runs = config.get("runs", 1)  # TODO: calculate from locations
    dt = config.get("dt", 3600) / 3600 / 24
    workers = config.get("workers", 1)
    volume = config.get("volume", 1000.0)  # TODO: look up from grid
    steps = config.get("days", 30) * 24  # TODO: calculate from GoodBuoy

    location = body.get("location", None)
    forcing = body.get("forcing")

    # weight = request.args.get("weight")  # TODO: shell length as alternative
    forcing_array = [[body.get("forcing")] * steps] * runs

    result = batch(
        workers=workers,
        forcing=tuple(forcing_array),
        config={
            "species": species,
            "culture": "midwater",
            "weight": weight,
            "dt": dt,
            "volume": volume,
        },
    )

    result["uid"] = session
    result["forcing"] = forcing
    result["location"] = location

    result["logs"] = client.upload(
        label=str(uuid4()).replace("-", ""),
        data=reduce(lambda a, b: a + b, result.pop("logs")),
        metadata=client.metadata_template(
            file_type="log", parent=session, headers=app.app.config["headers"]
        ),
    )

    _ = client.upload(
        label=session,
        data=result,
        metadata=client.metadata_template(
            file_type="experiment", parent=objectKey, headers=app.app.config["headers"]
        ),
    )

    config["experiments"].append(session)
    config["metadata"]["totalRuns"] += result["count"]
    _ = client.upload(
        label=objectKey,
        data=config,
        metadata=client.metadata_template(
            file_type="configuration", headers=app.app.config["headers"]
        ),
    )

    return result, 200


@Storage.session(config=app.app.config)
def get_object(objectKey: str, client: Storage, **kwargs):
    """
    Browse saved results for a single model configuration. Results from different configurations are probably not
    directly comparable, so we make this a reduce the chances that someone makes wild conclusions comparing numerically
    different models.

    You can only access results for that test, although multiple collections may be stored in a single place

    :param objectKey:
    :param client: s3 connection
    :return:
    """
    raw = client.download(object_name=objectKey)
    if raw is None:
        return f"Object ({objectKey}) not found", 404
    return load_json(raw), 200


@Storage.session(config=app.app.config)
@Storage.lock
def delete_object(objectKey: str, client: Storage, **kwargs):
    """
    Delete a cached result. Try not to do this.

    :param objectKey: UUID for resource
    :param client: storage client
    """
    if not client.delete(object_name=objectKey):
        return f"Object ({objectKey}) not found", 404
    return None, 204


@Storage.session(config=app.app.config)
@Storage.lock
def update_object(
    objectKey: str, body: dict, index: dict, client: Storage, **kwargs
) -> tuple:
    """
    Change the model configuration
    :param objectKey: identity of the configuration to use
    :param body:
    :param index: metadata.json
    :param client: storage connection

    :param kwargs:
    :return:
    """
    if objectKey not in index["configurations"]:
        return "Configuration not found", 404

    config = client.download(object_name=objectKey)
    # TODO: true recursive, so that partial descriptions don't overwrite data
    for key, val in body.items():
        if isinstance(val, dict):
            for k, v in val.items():
                config[key][k] = v
            continue
        config[key] = val
    return None, 204
