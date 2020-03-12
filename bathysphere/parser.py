from itertools import repeat
from multiprocessing import Pool
from collections import deque
from re import sub
from xml.etree import ElementTree
from datetime import datetime, timedelta

try:
    from numpy import frombuffer
except ImportError as _:
    print("Numerical libraries are not installed")

from bathysphere.datatypes import TimeStamp, Frame


