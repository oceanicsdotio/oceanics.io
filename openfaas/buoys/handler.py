from os import getenv
from json import loads, dumps
from requests import get
from collections import deque
from itertools import repeat

import hmac
import hashlib


def handle(req):
    # We receive the hashed message in form of a header

    if getenv("Http_Method") != "POST":
        print(dumps({"Error": "Require POST"}))
        exit(403)

    with open("/var/openfaas/secrets/payload-secret", "r") as secretContent:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(secretContent.read().encode(), req.encode(), hashlib.sha1)
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
            print(dumps({"Error": "HMAC validation"}))
            exit(403)

    body = loads(req)
    interval = body.get("interval", (None, None))
    limit = body.get("limit", None)
    encoding = body.get("encoding", "txt")
    node = body.get("id", None)
    fields = body.get("observedProperties", None)
    if not any((limit, *interval)) or not any((fields, node)) or encoding not in ("txt", "json"):
        return {"Message": "Bad Request"}

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
    return dumps({
        **data,
        "values": [dict(zip(k, v)) for k, v in zip(repeat(keys), lines)]
    })
