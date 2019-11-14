from itertools import repeat
from multiprocessing import Pool
from collections import deque
from re import sub
from xml.etree import ElementTree

from datetime import datetime, timedelta
from bathysphere_graph.models import Frame


def wqm(frame, keys):
    # type: (Frame, (str, )) -> dict
    """
    Decode dataframe form water quality monitor instrument
    """
    frame.sensor = frame.bytes[:9].decode()
    frame.time = datetime.strptime(
        frame.bytes[20:26].decode() + frame.bytes[27:33].decode(), "%m%d%y%H%M%S"
    )
    assert frame.time < frame["ts"]  # created date is before arrival time stamp

    frame.data = {
        key: value for key, value in zip(keys, frame.bytes[34:].decode().split(","))
    }
    return frame


def seafet(frame: Frame, brk: int, keys: list, sep: bytes = b","):
    frame.sensor = frame.bytes[:brk].decode()
    assert frame.sensor[3:6] == "PHA"
    data = frame.bytes[brk + 1 :].split(sep)
    frame.time = datetime.strptime(data[1].decode(), "%Y%j") + timedelta(
        hours=float(data[2].decode())
    )
    frame.data = {key: value.decode() for key, value in zip(keys, data[3:])}
    return frame


def by_key(frame: Frame, frames: dict, headers: dict):
    sn = int(frame.label[-4:])
    pattern = frame.bytes[:10].decode()
    if pattern[:3] == "SAT":
        pattern = pattern

    key = [
        headers[sn][key] for key in headers[sn].keys() if pattern in headers[sn][key]
    ][0]
    loc = frame.bytes.find(key.encode())
    buffer = frame.bytes[loc + len(key) :]
    fr = [
        frames[sn][key]["SensorFieldGroup"]
        for key in frames[sn].keys()
        if pattern in headers[sn][key]
    ][0]

    binary = ((True for key in each.keys() if ("Binary" in key)) for each in fr)
    dat, extra = (binary_xml if any(binary) else ascii_xml)(buffer, f)
    loc = extra.find(b"\r\n")

    if frame.data is None:
        frame.data = []

    frame.data = {
        "content": dat,
        "ts": timestamp(extra[loc + 2 : loc + 9]),
        "type": "sensor",
    }
    frame.bytes = extra[loc + 9 :]
    frame.size: len(frame.bytes)


def timestamp(buffer: bytes, byteorder: str = "big") -> datetime:
    """
    Convert two byte words into integer strings, and then date time. Only works for Satlantic date formats.
    """
    assert len(buffer) == 7
    yyyydddhhmmssmmm = "{:07}{:09}".format(
        int.from_bytes(buffer[:3], byteorder=byteorder),
        int.from_bytes(buffer[3:], byteorder=byteorder),
    )
    return datetime.strptime(yyyydddhhmmssmmm, "%Y%j%H%M%S%f")


def analog(frame: Frame, headers: dict, width: int = 35, key: str = "STORX"):
    """
    Parse analog frame

    :param frame: dictionary frame
    :param frames: dataframe description
    :param width: width of frame
    :param key: search pattern
    :return: updated frame
    """
    sn = int(frame["key"][-4:])
    buffer = frame.bytes[10:width]
    f = headers[sn].goto(key)
    values, extra = binary_xml(buffer, f)
    frame.update(values)
    frame.ts = timestamp(extra[:7])
    frame.bytes = frame.bytes[width:]
    frame.size = len(frame.bytes)
    return frame


def gps(frame: Frame, headers: dict, key: bytes = b"$GPRMC"):
    """Decode bytes as GPGGA or GPRMC location stream"""
    sn = int(frame["key"][-4:])
    loc = frame.bytes.find(key)
    if loc == -1:
        return frame
    buffer = frame.bytes[loc + len(key) + 1 :]
    f = headers[sn].goto("MODEM")
    nav, extra = ascii_xml(buffer, f)
    frame.data = {"content": nav, "ts": timestamp(extra[2:9]), "type": "nav"}
    frame.bytes = extra[9:]
    frame["size"] = len(frame.bytes)
    return frame


def line(cls, bytes_string):
    keys = [b"SAT", b"WQM"]
    lines = cls.split(bytes_string, keys)
    results = []
    for each in lines:
        result = dict()
        result["raw"] = each
        try:
            data, ts = each.split(b"\r\n")
            result["ts"] = cls.timestamp(ts)
        except ValueError:
            data = each
            result["ts"] = None

        result.bytes = data
        results.append(result)
    return results


def ascii_xml(buffer: str, frames: list):

    result = dict()
    offset = 0
    delims = [each["SensorField"]["Delimiter"].encode() for each in frames]
    for each, sep in zip(frames[:-1], delims[1:]):
        loc = buffer.find(sep, offset)
        count = loc - offset
        wd = count + 1
        name = each["Name"]
        result[name] = buffer[offset:loc]
        offset += wd
    end = offset + 2
    result[frames[-1]["Name"]] = buffer[offset:end]
    return result, buffer[end:]


def binary_xml(buffer: bytes, frames: list, byteorder: str = ">") -> (dict, bytes):
    """
    Parse raw bytes according to format described in XML frames
    """
    result = dict()
    offset = 0
    wc = {"BF": 4, "BD": 8, "BS": 1, "BU": 1, "AF": 1, "BULE": 1, "BSLE": 1}

    for each in frames:
        keys = each.keys()
        dtype_key = [key for key in keys if ("Binary" in key and "Data" in key)].pop()

        if "BinaryFloatingPoint" in dtype_key:
            txt = each[dtype_key]
            wd = wc[txt]
            np_type = byteorder + "f" + str(wd)

        elif "BinaryInteger" in dtype_key:
            txt = each[dtype_key]["Type"]
            wd = wc[txt] * int(each[dtype_key]["Length"])
            np_type = byteorder + "u" + str(wd)

        else:
            break

        name = each["Name"]
        result[name] = frombuffer(buffer, dtype=np_type, count=1, offset=offset)
        offset += wd

    return result, buffer[offset:]


def storx(frame, fields, name_length=10, verb=False):
    """
    Decode and process Satlantic sensor frames if format is known, or fail silently

    :param frame: incoming frame dictionary structure
    :param fields: field mappings for known sensor formats
    :param name_length: maximum size for name search pattern, 10 is Satlantic standard
    :param verb: verbose mode

    :return: possibly processed frame
    """

    delim = {"PHA": b",", "CST": b"\t"}  # SEAFET pH instrument  # CSTAR transmissometer

    brk = frame.bytes.find(b"\t")
    if brk == -1 or brk > name_length:
        brk = frame.bytes.find(b"\x00")
        if brk > name_length:
            print("Error. Instrument name appears to be too long:", frame.bytes[:32])
            return frame  # return unmodified frame

    frame.sensor = frame.bytes[:brk].decode()
    frame.time = None
    frame.data = None

    sensor = frame.sensor[3:6]
    try:
        sep = delim[sensor]
    except KeyError:
        pass  # just copy bytes
    else:
        start = 1
        rest = frame.bytes[brk + 1 :].split(sep)
        if sensor == "PHA":
            frame = seafet(frame, brk, keydic[sensor])
        else:
            try:
                keys = fields[sensor]
            except KeyError:
                frame.data = rest[start:]
            else:
                frame.data = {
                    key: value.decode() for key, value in zip(keys, rest[start:])
                }

    if verb and frame.data.__class__.__name__ == "dict":
        print(frame.sensor, "[", frame.time, "] ::", frame.data)

    return frame


def parse_buffer_queue(
    queue: deque, sequence: list, pool: Pool, frames: list
) -> (list, list):
    """
    Create a job queue and use pool of workers to process byte strings until consumed
    """
    processed = deque()
    for job in sequence:
        queue = pool.starmap(job, zip(queue, repeat(frames, len(queue))))
        processed.append(queue.pop(buffer) for buffer in queue if buffer["size"] == 0)

    return processed, queue


def _tree_depth(xml: str) -> int:
    """
    Get depth of tree
    """

    class _Parser:
        maxDepth = 0
        depth = 0

        def start(self, tag, attrib):
            self.depth += 1
            if self.depth > self.maxDepth:
                self.maxDepth = self.depth

        def end(self, tag):
            self.depth -= 1

        def close(self):
            return self.maxDepth

    parser = ElementTree.XMLParser(target=_Parser())
    parser.feed(xml)
    return parser.close()


def parse_xml_frames(
    config: dict, key: str = "sensor", depth: int = 10, verb: bool = False
) -> dict:
    """
    Get frames for all sensors on platform

    :param config: xml style dictionary format with all configuration data for sensor platform
    :param key: key for configured items
    :return: dictionary of with sensors as keys, and dataframe schema as value
    """

    def _goto(item):
        """
        Start node of frame
        """
        sensor = root.findall("./*/[@identifier='" + item["sensor"] + "']")[0]
        frame = sensor.findall("./*/[@identifier='" + item["frame"] + "']")[0]
        if verb:
            print(
                "Parsing from: . >",
                sensor.attrib["identifier"],
                ">",
                frame.attrib["identifier"],
            )
        return frame

    ns = "{http://www.satlantic.com/instrument}"
    root = ElementTree.fromstring(config["xml"]["content"])
    return {
        item[key]: _collect(_goto(item), depth=depth, namespace=ns, verb=verb)
        for item in config["config"]["content"]
    }


def parse_xml(xml, depth=None, verb=False):
    """
    Recursively collect XML sensor info as dict
    """
    return _collect(
        node=ElementTree.fromstring(xml),
        depth=depth if depth else _tree_depth(xml),
        namespace="{http://www.satlantic.com/instrument}",
        verb=verb,
    )


def _collect(
    node: ElementTree,
    depth: int,
    count: int = 0,
    namespace: str = None,
    verb: bool = False,
) -> dict or None:
    """
    Recursively collect child nodes and info.
    """
    collector = dict()
    if count >= depth:
        return None

    for child in node:
        below = _collect(child, depth, count=count + 1, namespace=namespace)
        tag = sub(namespace, "", child.tag)
        if below is None:
            collector[tag] = child.text
            continue

        queue = collector.get(tag, None)
        if queue is None:
            queue = collector[tag] = []
        queue.append(below)
        if verb:
            print("\t" * count + ">", tag + ":", collector[tag])

    return collector
