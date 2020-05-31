import pytest
from minio import Minio, Object
from bathysphere.datatypes import ObjectStorage
from flask import Response
from json import loads

from bathysphere.test.conftest import CREDENTIALS
from bathysphere.graph.models import Assets


@pytest.mark.object_storage
def test_datatypes_object_storage_metadata_template(object_storage):
    db = object_storage(prefix=None)
    _ = db.metadata_template()


@pytest.mark.object_storage
def test_datatypes_object_storage_get_index(object_storage):
    db = object_storage(prefix=None)
    assert db.stat_object("index.json")
    indexes = db.get_object("index.json")
    assert indexes


@pytest.mark.object_storage
def test_datatypes_object_storage_list_objects(object_storage):

    db = object_storage(prefix=None)
    data = db.list_objects()

    for each in data:
        assert isinstance(each, Object)


@pytest.mark.object_storage
def test_datatypes_object_storage_put_object(object_storage):

    db = object_storage(prefix=None)
    db.put_object(object_name="bathysphere-test", data={"message": "this is just a test."})
    assert db.stat_object("bathysphere-test")


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_unlock(object_storage):

    # db = object_storage(prefix=None)
    assert False


@pytest.mark.object_storage
def test_datatypes_object_storage_update_index(object_storage):

    db = object_storage(prefix=None)
    obj = db.get_object(object_name="bathysphere-test")
    assert isinstance(obj, Response), type(obj)
    assert obj.data, obj.data
    decoded = loads(obj.data.decode())
    assert decoded["message"] == "this is just a test.", decoded
    


@pytest.mark.object_storage
def test_datatypes_object_storage_delete(object_storage):

    test_key = "bathysphere-test"
    db = object_storage(prefix=None)
    errors = db.delete(prefix=test_key)
    for each in errors:
        print(f"Deletion error: {each}")
    assert db.stat_object(test_key) is None


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_session(object_storage):

    # db = object_storage(prefix=None)
    assert False
