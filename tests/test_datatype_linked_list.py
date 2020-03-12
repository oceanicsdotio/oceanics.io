
from bathysphere.datatypes import LinkedList

def test_datatypes_linked_list():
    LL = LinkedList(tuple(range(4)))
    LL.traverse()
    LL.k_from_head(1)
    LL.k_from_end(1)
    LL.prepend(0)
    LL.append(3)
    LL.traverse()
    LL.deduplicate()
    LL.traverse()
