"""
The `storage` module provides a mutex framework for distributed 
applications that use S3-compatible storage as a backend.

It is intended to be used in cloud functions, so some imports
are locally scoped to improve initial load time. 
"""
from os import getenv
from json import dumps, load

from datetime import datetime, timedelta
from minio import Minio
from uuid import uuid4

import attr

def require(name):
    env_var = getenv(name)
    if not env_var:
        raise EnvironmentError(f"{name} not set")
    return env_var

[STORAGE_ENDPOINT, BUCKET_NAME, SPACES_ACCESS_KEY, SPACES_SECRET_KEY, SERVICE_NAME] = \
    map(require, ["STORAGE_ENDPOINT", "BUCKET_NAME", "SPACES_ACCESS_KEY", "SPACES_SECRET_KEY", "SERVICE_NAME"])
    
@attr.s
class MetaDataTemplate:
    """
    Files use the `x-amz-meta` prefix for custom metadata.

    This makes the files searchable using only head requests. 
    """
    x_amz_acl: str = attr.ib(default="public-read")
    x_amz_meta_parent: str = attr.ib(default=None)
    x_amz_meta_created: str = attr.ib(factory=lambda: datetime.utcnow().isoformat())
    x_amz_meta_service_file_type: str = attr.ib(default=None)
    x_amz_meta_service: str = attr.ib(default=None)

    @property
    def headers(self):
        """
        Create dictionary that can be used as header values
        """
        non_null_headers = filter(
            lambda item: item[1] is not None, vars(self).items()
        )
        return {k.replace("_", "-"): v or "" for k, v in non_null_headers}

@attr.s
class Storage:
    """
    Storage is an interface to cloud object storage. 
    This should work with any S3-compatible provider, but
    has only been tested with DigitalOcean. 
    """
    endpoint: str = attr.ib()
    service_name: str = attr.ib()
    _driver: Minio = attr.ib(default=None)
    bucket_name: str = attr.ib(factory=lambda: getenv("BUCKET_NAME", "oceanicsdotio"))
    index: str = attr.ib(default="index.json")
    session_id: str = attr.ib(factory=lambda: str(uuid4()).replace("-", ""))

    lock_file: str = attr.ib(default="lock.json")
    

    @property
    def driver(self):
        if self._driver is None:
            self._driver = Minio(
                endpoint=self.endpoint, 
                secure=True,
                access_key=SPACES_ACCESS_KEY,
                secret_key=SPACES_SECRET_KEY
            )
        return self._driver

    def get_object(self, object_name):
        """
        Overwrite the data request method.
        """
        return self.driver.get_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def stat_object(self, object_name):
        """
        Overwrite the metadata request method.
        """
        return self.driver.stat_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def remove_object(self, object_name):
        """
        Overwrite the delete request method.
        """
        return self.driver.remove_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def put_object(self, object_name, data, metadata):
        # typing: (str, bytes, dict) -> (None)
        """
        Overwrite the upload method
        """
        from io import BytesIO

        buffer = bytes(dumps(data).encode("utf-8"))

        self.driver.put_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}",
            data=BytesIO(buffer),
            length=len(buffer),
            metadata=metadata,
            content_type="application/json",
        )

    @classmethod
    def session(cls, fcn):
        """
        Decorate a function so that it creates a locking semaphore
        for other processes, so they will not overwrite or access
        data that are being used concurrently. 

        Session data are preserved, and can be referenced later.
        
        The decorator creates an S3 client, retrieves
        the service index file, and injects it into
        the wrapped function as a keyword argument.
        """


        from minio.error import S3Error  # pylint: disable=no-name-in-module

        def wrapper(*args, **kwargs):
            """
            Check if locked, try to lock, do something, unlock.
            """
            client = Storage(STORAGE_ENDPOINT, SERVICE_NAME)

            try:
                _ = client.stat_object(client.index)
            except S3Error:
                client.put_object(
                    object_name=client.index,
                    data={"configurations": []},
                    metadata=MetaDataTemplate(
                        x_amz_meta_service_file_type="index"
                    ).headers
                )
            
            try:
                data = client.get_object(client.lock_file)
            except S3Error:
                pass
            else:
                lock_data = load(data)
                expiry = lock_data.get("expires")
                if datetime.fromisoformat(expiry) > datetime.utcnow():
                    return f"Lock in place: {lock_data}", 403

            try:

                expiry = datetime.utcnow() + timedelta(seconds=30)
                client.put_object(
                    object_name=client.lock_file,
                    data={
                        "session": client.session_id,
                        "expires": expiry.isoformat()
                    },
                    metadata=MetaDataTemplate(x_amz_acl="private").headers,
                )  
            except S3Error:
                return "Failed to lock", 500
           
            try:
                result = fcn(*args, client=client, **kwargs)
            except Exception as ex:
                result = f"{ex}", 500
            
            try:
                client.remove_object(client.lock_file)
            except S3Error:
                return "Failed to unlock", 500
            
            return result

        return wrapper
