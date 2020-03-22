from time import sleep, time
from redis import StrictRedis
from pickle import dumps as pickle, loads as unpickle
from rq import Queue, Connection, Worker

from bathysphere import app
from bathysphere.datatypes import ObjectStorage


def test_datatypes_redis_queue_connection(cache):
    """
    Connect to a local redis instance and increment a key-value stored item
    """
    assert cache.time()
    key = "test-obj"
    json = {"name": "something", "description": "test object"}
    data = pickle(json)
    assert cache.set(name=key, value=data, ex=10)
    assert cache.incr("test-hits") >= 1
    assert unpickle(cache.get(name=key)) == json
    assert cache.delete(key)
    assert cache.delete("test-hits")


def test_datatypes_redis_queue_pubsub(cache):

    channel = "bathysphere-messages"
    sequence = (
        "hello",
        "how are you?",
        "goodbye"
    )

    pubsub = cache.pubsub()
    pubsub.subscribe(channel)

    for event in sequence:
        cache.publish(channel, event)

    received = []
    while True:
        message = pubsub.get_message()
        if message is None:
            break
        received.append(message)
        
    assert len(received) >= len(sequence)

