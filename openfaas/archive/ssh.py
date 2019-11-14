from time import sleep
from datetime import datetime
from subprocess import check_output


def shell(host, cmd, protocol="ssh", encoding="utf-8"):
    # type: (str, (str, ), str, str) -> str
    """
    Run command on remote server

    :param host: where to run
    :param cmd: list of command words
    :param protocol: how to talk to server, ssh usually
    :param encoding: text encoding
    :return: text response
    """
    return check_output(f"{protocol} {host} {' '.join(cmd)}", shell=True).decode(encoding)


def time(host, system_time_fmt, data_time_fmt):
    # type: (str, str, str) -> datetime
    """
    Get remote system time by SSH
    """
    string = shell(host=host, cmd=("date", f"+'{system_time_fmt}'"))
    return datetime.strptime(string.split("\n")[0], data_time_fmt)


def latest(host, path):
    # type: (str, str) -> str
    """
    Return the path of the most recent file in a directory, such as a log file.
    """
    return shell(host, ("ls", "-t", path, "|", "awk", "'{printf($0);exit}'"))


def csv_peek(host, path, end, rows, delimiter):
    # type: (str, str, str, str, str) -> (str, )
    """
    Return the last rows of remote CSV file using SSH
    """
    return shell(host=host, cmd=["cat", path, "|", end, rows]).split(delimiter)


def trigger(host, threshold, dt_fmt, period=60, path="/"):
    # type: (str, int, str, int, str) -> (dict,)
    """
    Keep checking remote CSV file using SSH until new data are available, then report that data.

    Expects the top of the file to be a row of field names, and the second row to be a label,
    such as a unit. Each following row is an array of values, the first being a timestamp.

    :param host: remote or local network address
    :param threshold: how often to expect a new value
    :param path: directory on remote server
    :param period: how often to expect new data
    :param dt_fmt: datetime format

    :return: itemized Observations
    """
    age = period * 2
    log = latest(host=host, path=path)
    delay = period // 10 + 1
    names, labels = csv_peek(
        host=host, path=log, end="head", rows="-n2", delimiter="\r\n"
    )
    data = []
    while age < threshold:
        data = csv_peek(host=host, path=log, end="tail", rows="-1", delimiter=";")
        _time = time(host)
        age = (_time - datetime.strptime(data[0], dt_fmt)).total_seconds()
        print(f"Waiting {delay} seconds for new data.")
        sleep(delay)

    return [{"name": n, "label": l, "value": d} for n, l, d in zip(names, labels, data)]
