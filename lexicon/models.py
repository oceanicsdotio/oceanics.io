import attr 

from itertools import chain

@attr.s
class Trie:
    """
    A Tree-like data structure is used for string translation, auto-correct, and auto-complete
    functionality when interacting with the backend.

    This is an enhanced Trie, which has a network of nodes representing sequences of symbols.
    The implementation does not re-link paths, and is only branching. 
    """

    word = attr.ib(default=None)
    weight = attr.ib(default=0)
    aliases = attr.ib(default=None)
    children = attr.ib(default=attr.Factory(dict))

    def insert(self, key: str, aliases: [str] = None) -> None:
        """
        Using the current node as the root, for each symbol in the word create or join 
        a child tree, and iteratively descend. Set the word of the final node to the 
        provided key.

        Optionally provide a list of aliases that can be returned.
        """
        node = self
        for symbol in key:
            if symbol not in node.children:
                node.children[symbol] = Trie()
            node = node.children[symbol]
            node.weight += 1

        node.word = key
        node.aliases = aliases

    @staticmethod
    def searchRecursive(node, symbol: str, pattern: str, previous: (int,), cost: int):
        """
        Descend through the tree, calculating the cost tables iteratively for subsets of the
        pattern
        """
        _filter = lambda x: len(x)
        row = (previous[0] + 1,)
        for column in range(1, len(pattern) + 1):
            row += (
                min(
                    row[column - 1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + int(pattern[column - 1] != symbol),
                ),
            )

        if min(row) <= cost:
            filtered = tuple(chain(*filter(_filter,
                tuple(Trie.searchRecursive(v, k, pattern, row, cost) for k, v in node.children.items()),
            ))) 
        else:
            filtered = ()

        return (((node.word, row[-1]),) if row[-1] <= cost and node.word is not None else ()) + filtered

    @staticmethod
    def levenshteinDistance(word1: str, word2: str) -> int:
        """
        Calculate the number of mutations needed to transform one sequence into
        a second sequention. This distance function is used to compare words for
        auto-correct functionality.
        """
        columns = len(word1) + 1
        rows = len(word2) + 1

        # build first row
        currentRow = [0]
        for column in range(1, columns):
            currentRow.append(currentRow[column - 1] + 1)

        for row in range(1, rows):
            previousRow = currentRow
            currentRow = [previousRow[0] + 1]

            for column in range(1, columns):

                insertCost = currentRow[column - 1] + 1
                deleteCost = previousRow[column] + 1

                if word1[column - 1] != word2[row - 1]:
                    replaceCost = previousRow[column - 1] + 1
                else:
                    replaceCost = previousRow[column - 1]

                currentRow.append(min(insertCost, deleteCost, replaceCost))

        return currentRow[-1]

    @staticmethod
    def search(words: {str}, pattern: str, maxCost: int) -> ((str, int)):
        """
        Use simple memory-efficient search if the structure is trivial. Try `searchRecursive`
        for faster/larger searches on large structures.
        """
        _results = ()
        for word in words:
            cost = Trie.levenshteinDistance(pattern, word)
            if cost <= maxCost:
                _results += ((word, cost),)
        return _results