from bidict import bidict
from difflib import SequenceMatcher
from functools import reduce


def autoCorrect(key, lookup, maximum=0.0, threshold=0.25):
    # type: (str, bidict, float, float) -> str
    """
    Match fieldnames probabilistically
    """
    fields = lookup.keys()
    seq = SequenceMatcher(isjunk=None, autojunk=False)

    def _score(x):
        seq.set_seqs(key.lower(), x.lower())
        return seq.ratio()

    def _reduce(a, b):
        return b if (b[1] > a[1]) and (b[1] > threshold) else a

    return reduce(_reduce, zip(fields, map(_score, fields)), (key, maximum))



def restore_fields(final, units):
    # type: ((str, ), (str, )) -> (str,)
    """
    Get the original header name back by reversing clean_fields() operation.
    """
    names = map(lambda n: n.replace("_plus", "(0+)").replace("_minus", "(0-)"), final)
    return tuple(
        map(
            lambda f, u: f"{f} [{u}]".replace("_", " ").replace("percent", "%"),
            zip(names, units),
        )
    )


def clean_fields(fields):
    # type: ((str, )) -> ((str, ), (str, ))
    """
    Make friendly formats for object and table naming. The inverse is restore_fields().
    """
    def _clean(x):
        return x.strip()\
                .replace(" ", "_")\
                .replace("%", "_percent")\
                .replace("+", "_plus")\
                .replace("-", "_minus")

    return tuple(*zip(map(lambda u, v: (_clean(u), _clean(v)), fields.split("["))))


# def up(host: str, sites: list, fields: list, refresh=10):
#     """
#     Run a process that continuously updates the local database from a remote target.
#     """
#     db, cursor = bathysphere_functions_postgres(auth=app.app.config["PG_AUTH"])
#     start = datetime.utcnow()
#
#     while True:
#         print("Sleeping for", refresh, "seconds...")
#         sleep(refresh)
#         updates = dict()
#         for each in sites:
#             # request single observation, and compare it the database timestamp
#
#             if data.get("latest") > latest_ob_time(
#                 db, cursor, table=each["table"], time_field="date"
#             ):
#                 updates[each["node"]] = data