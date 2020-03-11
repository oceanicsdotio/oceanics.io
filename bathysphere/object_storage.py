from os import getenv
from json import dumps, loads
import hmac
import hashlib
from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey
from uuid import uuid4
from datetime import datetime
from flask import Response
from redis import StrictRedis


class ObjectStore(object):
