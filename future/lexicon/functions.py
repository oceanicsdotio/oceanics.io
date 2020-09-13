"""
The codex function translates between aliases
"""
from itertools import chain
from lexicon import Lexicon

def lexicon(
    word: str,
    mutations: int = 2,
    **kwargs
) -> (dict, int):

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