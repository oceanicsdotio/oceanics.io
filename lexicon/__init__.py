from lexicon.models import Trie

try:
    with open("/usr/share/dict/words", "rt") as fid:
        dictionary = fid.read().split()
    Lexicon = Trie()
    for word in dictionary:
        Lexicon.insert(word)
except:
    Lexicon = None