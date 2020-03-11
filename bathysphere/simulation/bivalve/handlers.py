from uuid import uuid4
from json import load as load_json
from functools import reduce

from bathysphere.simulation.bivalve.shellfish import batch
from bathysphere.datatypes import ResponseJSON, ObjectStorage

config = dict()

@ObjectStorage.session(config=config)
@ObjectStorage.lock
def get_index(
    index: dict, 
    **kwargs: dict
) -> ResponseJSON:
    """
    Get all model configurations known to the service

    :return:
    """
    try:
        return index, 200
    except IndexError:
        return "Embedded database not found", 404


@ObjectStorage.session(config=config)
@ObjectStorage.lock
def configure(
    body: dict, 
    index: dict, 
    session: str, 
    client: ObjectStorage
) -> ResponseJSON:
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
        metadata=client.metadata_template("configuration", headers=config["headers"]),
    )

    index["configurations"].append(session)
    _ = client.upload(
        label=config["index"],
        data=index,
        metadata=client.metadata_template("index", headers=config["headers"]),
    )
    return data, 200


@ObjectStorage.session(config=config)
@ObjectStorage.lock
def run_batch(
    objectKey: str,
    species: str,
    client: ObjectStorage,
    weight: float,
    session: str,
    body: dict = None,
    **kwargs: dict,
) -> ResponseJSON:
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
            file_type="log", parent=session, headers=config["headers"]
        ),
    )

    _ = client.upload(
        label=session,
        data=result,
        metadata=client.metadata_template(
            file_type="experiment", parent=objectKey, headers=config["headers"]
        ),
    )

    config["experiments"].append(session)
    config["metadata"]["totalRuns"] += result["count"]
    _ = client.upload(
        label=objectKey,
        data=config,
        metadata=client.metadata_template(
            file_type="configuration", headers=config["headers"]
        ),
    )

    return result, 200


@ObjectStorage.session(config=config)
def get_object(
    objectKey: str, 
    client: ObjectStorage, 
    **kwargs: dict
) -> ResponseJSON:
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


@ObjectStorage.session(config=config)
@ObjectStorage.lock
def delete_object(
    objectKey: str, 
    client: ObjectStorage, 
    **kwargs: dict
) -> ResponseJSON:
    """
    Delete a cached result. Try not to do this.

    :param objectKey: UUID for resource
    :param client: storage client
    """
    if not client.delete(object_name=objectKey):
        return f"Object ({objectKey}) not found", 404
    return None, 204


@ObjectStorage.session(config=config)
@ObjectStorage.lock
def update_object(
    objectKey: str, 
    body: dict, 
    index: dict, 
    client: ObjectStorage, 
    **kwargs: dict
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
