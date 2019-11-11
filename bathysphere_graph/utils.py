from asyncio import new_event_loop, set_event_loop, BaseEventLoop
from typing import Any
from requests import get
from datetime import datetime
from typing import Callable
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


def synchronous(task, loop=None, close=False):
    # type: (Callable, BaseEventLoop, bool) -> Any
    """
    Run an asynchronous tasks in serial. First build JSON structures with Co-routines in place of data,
    and then render the result of the Co-routines in-place.
    """
    if loop is None:
        close = True
        loop = new_event_loop()
    set_event_loop(loop)  # create the event loop
    result = loop.run_until_complete(task)
    if close:
        loop.close()
    return result


def log(message, file=None, console=True):
    # type: (str, str, bool) -> None
    """
    Write to console and/or file.

    :param message: content
    :param file: destination
    :param console: print to std out also
    :return: None
    """
    string = f"{datetime.utcnow().isoformat()} — {message}"
    if console:
        print(string)

    if file is not None:
        fid = open(file, "a")
        fid.write(string + "\n")
        fid.close()


def image(fcn):
    """
    Get the requested data as an image if image=True
    """

    def wrapper(*args, **kwargs):

        convert = kwargs.pop("image", False)
        data, status = fcn(*args, **kwargs)
        if status != 200 or not convert:
            return data, status

        try:
            response = get(url="localhost", json=data)
            # img = BytesIO()
            # make request to image service
            # img.seek(0)
            # send_file(img, mimetype='image/png')

        except:
            return {'message': 'Could not reach rendering service'}, 500

        return response

    return wrapper
