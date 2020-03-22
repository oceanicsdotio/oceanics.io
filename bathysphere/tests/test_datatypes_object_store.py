import pytest
from minio import Minio, Object
from bathysphere.datatypes import ObjectStorage


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
    print(type(indexes), indexes)


@pytest.mark.object_storage
def test_datatypes_object_storage_list_objects(object_storage):

    db = object_storage(prefix=None)
    data = db.list_objects()

    for each in data:
        assert isinstance(each, Object)


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_put_object(object_storage):

    # db = object_storage(prefix=None)
    # db.put_object()
    assert False


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_unlock(object_storage):

    # db = object_storage(prefix=None)
    assert False


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_update_index(object_storage):

    # db = object_storage(prefix=None)
    assert False


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_delete(object_storage):

    # db = object_storage(prefix=None)
    assert False


@pytest.mark.object_storage
@pytest.mark.xfail
def test_datatypes_object_storage_session(object_storage):

    # db = object_storage(prefix=None)
    assert False
