from redis import Redis
from pickle import dumps as pickle, loads as unpickle
from bathysphere_graph import app


def test_redis_connection():

    cache = Redis(
        host=app.app.config["REDIS_HOST"],
        port=25061,
        db=0,
        password=app.app.config["REDIS_KEY"],
        socket_timeout=3,
        ssl=True,
    )

    assert cache.time()
    key = "test-obj"
    json = {"name": "something", "description": "test object"}
    data = pickle(json)
    assert cache.set(name=key, value=data, ex=10)
    assert cache.incr("test-hits") == 1
    assert unpickle(cache.get(name=key)) == json
    assert cache.delete(key)
    assert cache.delete("test-hits")
