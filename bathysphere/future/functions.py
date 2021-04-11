# pylint: disable=invalid-name,line-too-long,eval-used,unused-import
"""
The functions module of the graph API contains handlers for secure
calls. These are exposed as a Cloud Function calling Connexion/Flask.
"""
from itertools import chain
from os import getenv
from datetime import datetime
from inspect import signature
from uuid import uuid4
from typing import Callable, Any, Iterable
from passlib.apps import custom_app_context
from flask import request
from neo4j import Record, Driver
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from itsdangerous.exc import BadSignature

from bathysphere import app, job

from json import load

from bathysphere.future.storage import Storage, MetaDataTemplate

COLLECTION_KEY = "configurations"
SERVICE = "https://bivalve.oceanics.io/api"
DEBUG = True

# For Response Typing
ResponseJSON = (dict, int)

@Storage.session
def index(client: Storage) -> (dict, int):
    """
    Get all model configurations known to the service.
    """

    from minio.error import S3Error  # pylint: disable=no-name-in-module

    try:
        return load(client.get_object(client.index)), 200
    except IndexError:
        return f"Database ({client.endpoint}) not found", 404
    except S3Error:
        return f"Index ({client.index}) not found", 404
    

@Storage.session
def configure(
    client: Storage, 
    body: dict
) -> (dict, int):
    """
    Create a new configuration

    :param body: Request body, already validated by connexion
    :param index: index.json data
    :param client: s3 storage connection
    :param session: UUID4 session id, used to name configuration
    """
    
    index = load(client.get_object(client.index))
    self_link = f"{SERVICE}/{client.session_id}"
    index[COLLECTION_KEY].append(self_link)
   
    client.put_object(
        object_name=f"{client.session_id}.json",
        data={
            **body, 
            "experiments": [],
            "uuid": client.session_id,
            "self": self_link
        },
        metadata=MetaDataTemplate(
            x_amz_meta_service_file_type="configuration",
            x_amz_meta_parent=client.index
        ).headers,
    )

    client.put_object(
        object_name=client.index,
        data=index,
        metadata=MetaDataTemplate(
            x_amz_meta_service_file_type="index",
            x_amz_meta_parent=client.service_name
        ).headers
    )

    return {"self": self_link}, 200


@Storage.session
def run(
    body: dict,
    objectKey: str,
    species: str,
    cultureType: str,
    client: Storage,
    weight: float
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

    from multiprocessing import Pool, cpu_count
    from itertools import repeat
    from time import time
    from functools import reduce

    from minio.error import S3Error  # pylint: disable=no-name-in-module
    
    try: 
        config = load(client.get_object(f"{objectKey}.json"))
        properties = config.get("properties")
    except S3Error:
        return f"Configuration ({objectKey}) not found", 404
    except Exception:
        return f"Invalid configuration ({objectKey})", 500
 
    start = time()
    processes = min(cpu_count(), properties.get("workers", cpu_count()))
   
    with Pool(processes) as pool:

        configuration = {
            "species": species,
            "culture": cultureType,
            "weight": weight,
            "dt": properties.get("dt", 3600) / 3600 / 24,
            "volume": properties.get("volume", 1000.0),
        }
        forcing = body.get("forcing")
        stream = zip(repeat(configuration, len(forcing)), forcing)
        data, logs = zip(*pool.starmap(job, stream))
        self_link = f"{SERVICE}/{client.session_id}"

        result = {
            "self": self_link,
            "configuration": f"{SERVICE}/{objectKey}",
            "forcing": forcing,
            "data": data,
            "workers": pool._processes,
            "start": start,
            "finish": time(),
        }
    
    try:
        client.put_object(
            object_name=f"{client.session_id}.logs.json",
            data=reduce(lambda a, b: a + b, logs),
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="log", 
                x_amz_meta_parent=client.session_id
            ).headers,
        )

        client.put_object(
            object_name=f"{client.session_id}.json",
            data=result,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="experiment", 
                x_amz_meta_parent=objectKey
            ).headers
        )

        config["experiments"].append(result["self"])

        client.put_object(
            object_name=f"{objectKey}.json",
            data=config,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="configuration", 
                x_amz_meta_parent=client.index
            ).headers
        )
    except Exception:
        return f"Error saving results", 500

    return {"self": self_link}, 200
 