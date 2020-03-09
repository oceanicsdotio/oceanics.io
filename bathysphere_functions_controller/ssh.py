from time import sleep
from datetime import datetime
from subprocess import check_output


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
    cmd = ("ls", "-t", path, "|", "awk", "'{printf($0);exit}'")
    log = check_output(f"ssh {host} {' '.join(cmd)}", shell=True).decode("utf-8")
    delay = period // 10 + 1
    cmd = ["cat", log, "|", "head", "-n2"]
    names, labels = check_output(f"ssh {host} {' '.join(cmd)}", shell=True).decode("utf-8").split("\r\n")
    data = []
    while age < threshold:
        cmd = ["cat", log, "|", "tail", "-1"]
        data = check_output(f"ssh {host} {' '.join(cmd)}", shell=True).decode("utf-8").split(";")
        cmd = ("date", f"+'{system_time_fmt}'")
        string = check_output(f"ssh {host} {' '.join(cmd)}", shell=True).decode("utf-8")
        _time = datetime.strptime(string.split("\n")[0], data_time_fmt)
        age = (_time - datetime.strptime(data[0], dt_fmt)).total_seconds()
        print(f"Waiting {delay} seconds for new data.")
        sleep(delay)

    return [{"name": n, "label": l, "value": d} for n, l, d in zip(names, labels, data)]
