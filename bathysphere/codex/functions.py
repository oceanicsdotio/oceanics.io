"""
The codex function translates between aliases
"""
from itertools import chain


from bathysphere.datatypes import ResponseJSON
from bathysphere.codex import Lexicon


def codex(
    word: str,
    mutations: int = 2,
    **kwargs
) -> ResponseJSON:

    return {"value": tuple(
        chain(
            *chain(
                Lexicon.searchRecursive(
                    node, symbol, word, tuple(range(len(word) + 1)), mutations
                )
                for symbol, node in Lexicon.children.items()
            )
        )
    )}, 200