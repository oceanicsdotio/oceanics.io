import time
from itertools import chain
from bathysphere.datatypes import Trie
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


def test_datatypes_trie():

    test_case = "baleful"
    mutations = 2
    with open("/usr/share/dict/words", "rt") as fid:
        dictionary = fid.read().split()
    trie = Trie()
    for word in dictionary:
        trie.insert(word)


    start = time.time()
    matches = Trie.search(dictionary, test_case, mutations)
    for result in matches:
        print(result)

    simple_search = (time.time() - start)
    start = time.time()

    matches = tuple(chain(*chain(
        Trie.searchRecursive(node, symbol, test_case, tuple(range(len(test_case) + 1)), mutations)
        for symbol, node in trie.children.items()
    )))

    for result in matches:
        print(result)
    trie_search = time.time() - start

    print(f"""
        Simple search: {int(simple_search*1000)/1000} s
        Trie search: {int(trie_search*1000)/1000} s
        Speedup: {int(simple_search/trie_search)}x
    """)

