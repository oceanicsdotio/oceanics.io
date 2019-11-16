from os import getenv
from json import loads, dumps
from requests import get
from collections import deque
from itertools import repeat

import hmac
import hashlib


def handle(event, context):
    # We receive the hashed message in form of a header

    if getenv("Http_Method") != "POST":
        print(dumps({"Error": "Require POST"}))
        exit(403)

    with open("/var/openfaas/secrets/payload-secret", "r") as fid:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(fid.read().encode(), event.encode(), hashlib.sha1)
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
            return {"Error": "HMAC validation"}, 403

    body = event.body
    interval = body.get("interval", (None, None))
    limit = body.get("limit", None)
    encoding = body.get("encoding", "txt")
    node = body.get("id", None)
    fields = body.get("observedProperties", None)
    if not any((limit, *interval)) or not any((fields, node)) or encoding not in ("txt", "json"):
        return {"Error": "Bad Request"}, 400

    host = getenv("hostname")
    times = f"&newest={limit}" if limit else "&min_date={}&max_date={}".format(*interval)
    url = f"http://{host}/cgi-data/nph-data.cgi?node={node}&y={','.join(fields)}{times}"
    response = get(url)
    content = response.content.decode()
    if not response.ok:
        print(content)
        exit(response.status_code)

    if encoding == "txt":
        return content

    lines = deque(filter(lambda x: len(x), content.split("\n")))
    name, alias = lines.popleft().split("-")
    data = {
        "name": name,
        "aliases": list(set(map(str.strip, (alias, lines.popleft()))))
    }
    lines = deque(map(lambda x: tuple(x.split("\t")), lines))
    keys = lines.popleft()
    return {
        **data,
        "values": [dict(zip(k, v)) for k, v in zip(repeat(keys), lines)]
    }, 200
