import pytest
from minio import Minio
from os import getenv
from bathysphere.datatypes import ObjectStorage


access_key, secret_key = getenv("OBJECT_STORAGE_SECRETS").split(",")



# def listenToEvents(
#     self, 
#     bucket_name: str, 
#     file_type: FileType = None, 
#     channel: str = "bathysphere-events"
# ):
#     fcns = ("s3:ObjectCreated:*", "s3:ObjectRemoved:*", "s3:ObjectAccessed:*")
#     r = StrictRedis()
#     for event in self.listen_bucket_notification(bucket_name, "", file_type, fcns):
#         r.publish(channel, str(event))


def test_datatypes_object_storage_list_objects(object_storage):
    
    db = object_storage(prefix="bathysphere")
    data = db.list_objects()
    print(data)


@pytest.mark.xfail
def test_datatypes_object_storage_put_object():
    assert False


@pytest.mark.xfail
def test_datatypes_object_storage_get_object():
    assert False


@pytest.mark.xfail
def test_datatypes_object_storage_stat_object():
    assert False

   
    # unlock
    # updateIndex
    # delete
    # metadata_template
    # session


