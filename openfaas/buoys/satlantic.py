
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
#     db, cursor = postgres(auth=app.app.config["PG_AUTH"])
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