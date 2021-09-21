---
title: Trie
date: "2020-12-24T17:55:00.000Z"
description: |
    Notes on implementation of trie graph stuctures.
tags: ["algorithms", "data structures", "trie", "sequences"]
citations:

  - authors: [Willard DE]
    year: 1984
    title: |
        Log-logarithmic worst-case range queries are possible in space Θ(n)
    journal: Information Processing Letters
    volume: "17"
    pageRange: [81, 84]

  - authors: [Willard DE]
    year: 1984
    title: |
      New trie data structures which support very fast search operations
    journal: Journal of Computer and System Sciences
    volume: "28(3)"
    pageRange: [379, 394]
---

## Trie

Tries are graphs of symbols. Words are accumulations of symbols along a path into the graph.

You `insert` words into the network, and mark the nodes that terminate words. All words sharing a prefix traverse the same path.

You can then `search` the trie for words, e.g. similar to a key word. This can be used to [correct spelling](http://norvig.com/spell-correct.html) and auto-complete inputs.

That requires a similarity function (Levenshtein distance). You traverse the graph and iteratively build a N\*M table, “answer” is the lower right value. This process is O(N\*M).

Tries can waste memory or storage. The lower limit is [4 bytes per edge](http://www.wutka.com/dawg.html), while remaining searchable.

For a vocabulary of ~100K words, a naive JSON output of the structure is 8MB.

We use tries to try to auto-correct fields in forms and API requests, provide helpful suggestions when there are bad inputs, and to clean and restore strings that have invalid characters.

### Variants

* When words share a prefix, you can extend the table instead of recomputing, which happens automatically given alphabetical inputs.

* Directed acyclic word graphs (DAWG): more efficient due to similar words with different prefix converging. These are also known as [minimal acyclic finite state automaton (MA-FSA)](https://www.aclweb.org/anthology/J00-1002.pdf). Insert alphabetically, and deduplicate after each branch. Duplicates are XNOR ends and point to the same nodes.

## Distance function

A direct comparison of words calculates the number of inserts, deletes, and replaces that need to occur for the sequences to be equal.

A minimal `JavaScript` version looks like this:

```JavaScript
/**
 * Calculate similarity of two patterns, usually words
 * for the purpose of auto-correct or spell checking
 */
const LevenshteinDistance = (a, b) => {
    let row = [...Array(a.length + 1).keys()];
   
    for (let ii = 1; ii < b.length + 1; ii++) {
        const previous = row;
        row = [previous[0] + 1];

        for (let jj = 1; jj < a.length + 1; jj++) {
            row.push(Math.min(
                row[jj - 1] + 1, // insert, 
                previous[jj] + 1, // delete, 
                previous[jj - 1] + (a[jj - 1] !== b[ii - 1] | 0) // replace
            ));
        }
    }
    return row.pop();
};
```
