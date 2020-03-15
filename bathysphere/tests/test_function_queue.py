from time import sleep
from redis import StrictRedis
from pickle import dumps as pickle, loads as unpickle
from rq import Queue, Connection, Worker

from bathysphere.tests.conftest import numberOfTheBeast
from bathysphere import app


def test_redis_connection():

    cache = StrictRedis(
        host=app.app.config["REDIS_HOST"],
        port=app.app.config["REDIS_PORT"],
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
    assert cache.incr("test-hits") >= 1
    assert unpickle(cache.get(name=key)) == json
    assert cache.delete(key)
    assert cache.delete("test-hits")


def scheduleJob():

    cache = StrictRedis(
        host=app.app.config["REDIS_HOST"],
        port=app.app.config["REDIS_PPORT"],
        db=0,
        password=app.app.config["REDIS_KEY"],
        socket_timeout=None,
        ssl=True,
    )
    q = Queue(connection=cache)  # no args implies the default queue
    job = q.enqueue(
        numberOfTheBeast, args=("foo", "bar"), result_ttl=500, job_timeout=180
    )
    print(job.result)  # => None

    # Now, wait a while, until the worker is finished
    sleep(2)
    print(job.result)


# Provide queue names to listen to as arguments to this script,
# similar to rq worker
def redisWorker():
    cache = StrictRedis(
        host=app.app.config["REDIS_HOST"],
        port=app.app.config["REDIS_PORT"],
        db=0,
        password=app.app.config["REDIS_KEY"],
        socket_timeout=None,
        ssl=True,
    )
    with Connection(connection=cache):
        qs = ["default"]
        w = Worker(qs)
        w.work()


# redisWorker()
