
// def report_buoy_data(body):
// """We receive the hashed message in form of a header"""
// from collections import deque
// from requests import get
// from os import getenv
// from json import dumps
// from itertools import repeat

// interval = body.get("interval", (None, None))
// limit = body.get("limit", None)
// encoding = body.get("encoding", "txt")
// node = body.get("id", None)
// fields = body.get("observedProperties", None)

// if (
//     not any((limit, *interval))
//     or not any((fields, node))
//     or encoding not in ("txt", "json")
// ):
//     return dumps({"Error": "Bad Request"}), 400

// host = getenv("hostname", "maine.loboviz.com")
// times = (
//     f"&newest={limit}" if limit else "&min_date={}&max_date={}".format(*interval)
// )
// url = f"http://{host}/cgi-data/nph-data.cgi?data_format=text&node={node}&y={','.join(fields)}{times}"
// response = get(url)
// content = response.content.decode()
// if not response.ok:
//     return response

// if encoding == "txt":
//     return content, 200

// lines = deque(filter(lambda x: len(x), content.split("\n")))
// name, alias = lines.popleft().split("-")
// data = {
//     "name": name,
//     "aliases": list(set(map(str.strip, (alias, lines.popleft())))),
// }
// lines = deque(map(lambda x: tuple(x.split("\t")), lines))
// keys = lines.popleft()
// return (
//     dumps(
//         {
//             **data,
//             "values": [
//                 dict(zip(k, v)) for k, v in zip(repeat(keys, len(lines)), lines)
//             ],
//         }
//     ),
//     200,
// )