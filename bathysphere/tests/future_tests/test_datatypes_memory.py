import pytest
from json import load
from pickle import loads as unpickle
try:
    from numpy import where
    from numpy.ma import MaskedArray
except:
    pass

from bathysphere.datatypes import Memory
from bathysphere.future.utils import interp2d_nearest

NBYTES = 100


# def single_index(fname, field, index):
#     nc = Dataset(fname, "r")  # open NetCDF for reading
#     print("Model:", nc.title)
#     print("Format:", nc.Conventions)
#     data = nc.variables[field][0:240, index]
#     return data


def subset(xx, yy, field, samples, mask):
    # type: (array, array, array, array) -> array
    
    
    total = (~mask).sum()
    nsamples = min(samples, total)
    inds = where(~mask)[0], nsamples
    xx = xx[inds]
    yy = yy[inds]
    zz = interp2d_nearest((xx, yy), field.data.flatten())
    return [xx, yy, zz]


# def avgvert(fname, key, mesh, host):
#     nc = Dataset(fname, "r")
#     temp = nc.variables[key]
#     nodes = mesh._GridObject__triangles[host, :]
#     aa = temp[0:240, 0, nodes[0]]
#     bb = temp[0:240, 0, nodes[1]]
#     cc = temp[0:240, 0, nodes[2]]
#     return (aa + bb + cc) / 3.0


def scan(dataset, attribute, required=None, verb=False):
    # type: (Dataset, str, set, bool) -> None
    flag = required is not None
    for var in getattr(dataset, attribute).values():
        if flag:
            required -= {var.name}
        if verb and attribute == "dimensions":
            print(f"{var.name}: {var.size}")
        if verb and attribute == "variables":
            print(
                f"{var.name}: {var.datatype}, {var.dimensions}, {var.size}, {var.shape}"
            )


def validate_remote_dataset(storage, dataset, dtype=(MaskedArray, dict, dict)):
    # type: (Storage, str, (type,)) -> None
    fetched = load(storage.get(f"{dataset}/index.json"))
    assert fetched
    for each in fetched:
        for i in unpickle(storage.get(f"{dataset}/{each}").data):
            assert isinstance(i, dtype)


def test_setup_mem_class():
    """Setup and check internal data structures"""
    mem = Memory(NBYTES)

    assert len(mem.buffer) == NBYTES
    assert len(mem.mask) == NBYTES
    assert len(mem.map) == 0
    assert mem.remaining == NBYTES


def test_non_silent_init_failure():
    """Raises memory error if requested buffer too long"""
    try:
        _ = Memory(size=NBYTES+1, max_size=NBYTES)
    except MemoryError:
        assert True
    else:
        assert False


def test_request_for_too_much_memory_failure():
    """Doesn't assign beyond available heap size"""
    mem = Memory(NBYTES)
    assert mem.remaining == NBYTES
    try:
        _ = mem.alloc(NBYTES + 1)
    except MemoryError:
        failed = True
    else:
        failed = False

    assert failed


def test_single_allocation():
    """Assigning to pointer changes underlying data"""

    mem = Memory(NBYTES)
    n = NBYTES // 10
    ptr = mem.alloc(n)
    assert mem.remaining == NBYTES - n
    assert mem.buffer[0] == b""
    mem.set(ptr, b"a")
    assert mem.buffer[0] == b"a"
    assert mem.buffer[1] == b"a"

    assert mem.free(ptr)

    assert mem.remaining == NBYTES
