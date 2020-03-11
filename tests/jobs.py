from time import sleep


# @job('low', connection=my_redis_conn, timeout=5)
def numberOfTheBeast(a, b):
    sleep(3)
    return 666, a, b
