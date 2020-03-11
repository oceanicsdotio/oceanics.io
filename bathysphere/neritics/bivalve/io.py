from io import TextIOWrapper
from json import dumps, loads, decoder
from json import load as load_json
from requests import get, post
from requests.exceptions import ConnectionError
from urllib3.exceptions import MaxRetryError
from uuid import uuid4
from os import getpid
from datetime import datetime
from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey


class JSONIOWrapper(TextIOWrapper):
    @staticmethod
    def log(message: str, data: str, log: BytesIO = None, arrow: str = "->") -> None:
        """
        Log notifications.

        :param message: some event notification
        :param data: data that resulted in message
        :param log: log file or interface
        :param arrow: symbol indicating direction of flow

        :return:
        """
        timestamp = datetime.now().isoformat(sep=" ")
        string = f"[{timestamp}] (PID {getpid()}) {message} {arrow} {data}"
        if log is not None:
            log.write((string + "\n").encode())
            return None
        print(string)

    def receive(self, log: BytesIO) -> dict:
        """
        Receive serialized data from command line interface.
        """
        json = self.readline()
        self.log("Receive", json.rstrip(), log=log, arrow="<-")
        try:
            data = loads(json.rstrip())
        except decoder.JSONDecodeError as decode_error:
            self.log(message="Job cancelled", data=decode_error.msg, log=log)
            message = "no data received" if json is "\n" else decode_error.msg
            return {"status": "error", "message": message, "data": json}

        return data

    def send(self, data: dict, log: BytesIO) -> None:
        """
        Write serialized data to interface.
        """

        def _transform():
            safe_keys = {key.replace(" ", "_"): value for key, value in data.items()}
            return f"'{dumps(safe_keys)}'".replace(" ", "")

        json = _transform()
        self.log(message="Send", data=json, log=log)
        self.write(f"{json}\n")

    def dump(self) -> None:
        """
        Propagates messages up through C#, subprocess, and control layers.
        """
        response = self.readline()
        while response != "":
            response = self.readline()
            print(response.rstrip())


class Storage(Minio):
    def __init__(self, bucket_name, **kwargs):
        self.bucket_name = bucket_name
        Minio.__init__(self, **kwargs)
        if not self.bucket_exists(bucket_name):
            _ = self.make_bucket(bucket_name)

    def exists(self, cacheKey: str):
        """Determine whether object exists"""
        try:
            meta = self.stat_object(self.bucket_name, cacheKey)
            return True, meta
        except NoSuchKey:
            return False, None

    def _lock(self, session_id: str, object_name: str, headers: dict) -> bool:
        try:
            self.upload(
                label=object_name,
                data={"session": session_id},
                metadata=self.metadata_template("lock", headers=headers),
            )
        except NoSuchKey:
            return False
        else:
            return True

    def _unlock(self, object_name: str):
        try:
            self.remove_object(bucket_name=self.bucket_name, object_name=object_name)
        except NoSuchKey:
            return False
        else:
            return True

    def upload(
        self,
        label: str,
        data: dict or bytes,
        metadata: dict = None,
        codec: str = "utf-8",
    ) -> str:
        """
        Create an s3 connection if necessary, then create bucket if it doesn't exist.

        :param label: label for file
        :param data: data to serialize
        :param metadata: headers
        :param codec: how to encode strings

        :return: None
        """
        if isinstance(data, dict):
            content_type = "application/json"
            buffer = bytes(dumps(data).encode(codec))
        elif isinstance(data, bytes):
            content_type = "text/plain"
            buffer = data
        else:
            raise TypeError

        self.put_object(
            bucket_name=self.bucket_name,
            object_name=label,
            data=BytesIO(buffer),
            length=len(buffer),
            metadata=metadata,
            content_type=content_type,
        )

        return label

    def download(self, object_name: str):
        try:
            data = self.get_object(
                bucket_name=self.bucket_name, object_name=object_name
            )
        except NoSuchKey:
            return None
        return data

    def delete(self, object_name: str):
        try:
            self.remove_object(bucket_name=self.bucket_name, object_name=object_name)
        except NoSuchKey:
            return False
        return True

    @staticmethod
    def metadata_template(file_type: str = None, parent: str = None, **kwargs) -> dict:
        if file_type == "lock":
            write = {"x-amz-acl": "private"}
        else:
            write = {"x-amz-acl": "public-read"}
        if parent:
            write["z-amz-meta-parent"] = parent

        write["x-amz-meta-created"] = datetime.utcnow().isoformat()
        write["x-amz-meta-service-file-type"] = file_type
        return {**kwargs["headers"], **write}

    @classmethod
    def lock(cls, fcn):
        def wrapper(
            client: Storage,
            session: str,
            index: dict,
            lock: str,
            headers: dict,
            *args,
            **kwargs,
        ):
            locked, meta = client.exists(lock)
            if locked:
                return "Lock in place", 500
            client._lock(session, object_name=lock, headers=headers)
            try:
                result = fcn(
                    *args, index=index, client=client, session=session, **kwargs
                )
            except Exception as ex:
                result = f"{ex}", 500
            finally:
                if lock and not client._unlock(object_name=lock):
                    result = "Failed to unlock", 500
            return result

        return wrapper

    @classmethod
    def session(cls, config: dict = None):
        def decorator(fcn):
            def wrapper(*args, **kwargs):

                client = cls(bucket_name=config["bucketName"], **config["storage"])
                buffer = client.download(object_name=config["index"])
                index = load_json(buffer) if buffer else {"configurations": []}
                return fcn(
                    client=client,
                    session=str(uuid4()).replace("-", ""),
                    index=index,
                    lock=config["lock"],
                    headers=config["headers"],
                    *args,
                    **kwargs,
                )

            return wrapper

        return decorator


class Graph:
    @staticmethod
    def register(config: dict):

        if config["join"] and not config["graph"]:
            hosts = config["join"].copy()
            while hosts:
                host = hosts.pop()
                response = get(config["graphHealthcheck"].format(host))
                if response.ok:
                    config["graph"] = host
                    break

        if config["graph"] is not None:
            try:
                register = post(
                    config["graphAuth"].format(config["graph"]),
                    json={
                        "email": config["graphUser"],
                        "password": config["graphPassword"],
                        "apiKey": config["graphApiKey"],
                    },
                )
            except ConnectionError or MaxRetryError:
                config["graph"] = None
            else:
                assert register.ok

    @staticmethod
    def create(cls, obj: dict, url: str, token: str) -> tuple or None:
        url = f"{url}/{cls}"
        return post(url=url, json=obj, headers={"Authorization": f"Bearer {token}"})
