import pytest
from bathysphere.datatypes import Memory

NBYTES = 100


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
