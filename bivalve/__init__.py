from connexion import App, FlaskApp
from flask_cors import CORS
from os import getenv
from pathlib import Path
from yaml import load, Loader
from prance import ResolvingParser
from functools import reduce
from subprocess import Popen


from io import TextIOWrapper, BytesIO
from json import dumps, loads, decoder
from os import getpid
from datetime import datetime
import attr
from typing import Any, Iterable


@attr.s(repr=False)
class Message:
    message: str = attr.ib()
    timestamp: str = attr.ib(factory=datetime.now)
    arrow: str = attr.ib(default=">")
    data: Any = attr.ib(default=None)

    def __repr__(self):
        return f"[{self.timestamp.isoformat(sep=' ')}] (PID {getpid()}) {self.message} {self.arrow} {self.data}\n"

    def log(self, log: BytesIO = None):
        """
        Log notifications.

        :param message: some event notification
        :param data: data that resulted in message
        :param log: log file or interface
        :param arrow: symbol indicating direction of flow
        """
        if log:
            log.write(str(self).encode())

@attr.s
class JSONIOWrapper:
    """
    Models that run in other languages exchange messages through
    the command prompt text interface using JSON encoded strings.
    """
    log: BytesIO = attr.ib()
    text_io: TextIOWrapper = attr.ib(factory=TextIOWrapper)

    @classmethod
    def output(cls, *args, log, **kwargs):
        return cls(
            log=log,
            text_io=TextIOWrapper(
                *args, 
                line_buffering=False, 
                encoding="utf-8",
                **kwargs
            )
        )

    @classmethod
    def console(cls, *args, log, **kwargs):
        return cls(
            log=log,
            text_io=TextIOWrapper(
                *args, 
                line_buffering=True, 
                encoding="utf-8",
                **kwargs
            )
        )


    def receive(self) -> dict:
        """
        Receive serialized data from command line interface.
        """
        data = self.text_io.readline().rstrip()
        Message("Receive", data=data, arrow="<").log(self.log)
        try:
            return loads(data)
        except decoder.JSONDecodeError as err:
            Message("Job cancelled", data=err.msg).log(self.log)
            return {
                "status": "error", 
                "message": "no data received" if data is "\n" else err.msg, 
                "data": data
            }

    def send(self, data: dict):
        """
        Write serialized data to interface.
        """
       
        safe_keys = {
            key.replace(" ", "_"): value for key, value in data.items()
        }
          
        json = f"'{dumps(safe_keys)}'".replace(" ", "")
        Message(
            message="Send", 
            data=json,
            arrow=">"
        ).log(self.log)

        self.text_io.write(f"{json}\n")

@attr.s
class Process:
    """
    Data structure to handle communication with a running
    subprocess
    """
    command: [str] = attr.ib()
    log: BytesIO = attr.ib(factory=BytesIO)
    result = attr.ib(factory=list)

    _process = attr.ib(default=None)
    _console: JSONIOWrapper = attr.ib(default=None)
    _output: JSONIOWrapper = attr.ib(default=None)

    @classmethod
    def start(cls, command, config):

        process = cls(command)

        Message(
            message=f"Spawned process {process.pid}", 
            data=process.args
        ).log(process.log)
        
        process.result = process.receive(2)
        process.send(config)

        Message(
            message="Worker ready", 
            data=f"expecting transactions"
        ).log(process.log)

        return process

    def __del__(self):
        """
        Clean up before going out of scope
        """

        Message(
            message="Worker done",
            data="completed transactions"
        ).log(self.log)

        self.process.kill()
        self.process.wait()
        self.console.text_io.close()
        self.output.text_io.close()

    @property
    def pid(self):
        """Hoist process ID"""
        return self.process.pid

    @property
    def args(self):
        """Hoist process Args"""
        return self.process.args

    @property
    def process(self):
        from subprocess import PIPE, STDOUT

        if self._process is None:
            self._process = Popen(
                self.command, 
                stdin=PIPE, 
                stdout=PIPE, 
                stderr=STDOUT, 
                bufsize=1
            )
        return self._process

    @property
    def console(self):
        """
        Lazy load a message interface
        """
        if self._console is None:
            self._console = JSONIOWrapper.console(self.process.stdin, log=self.log)
        return self._console

    @property
    def output(self):
        """
        Lazy load a message interface
        """
        if self._output is None:
            self._output = JSONIOWrapper.output(self.process.stdout, log=self.log)
        return self._output 

    def send(self, data: dict):
        """
        Hoist the send function of the commandline interface
        """
        self.console.send(data)

    def receive(self, count=1):
        """
        Hoist the receive function of the commandline interface
        """
        return [self.output.receive() for _ in range(count)]

 
def job(config: dict, forcing: tuple) -> (tuple, bytes):
    """
    Execute single simulation with synchronous callback.

    :param config: simulation configuration
    :param forcing: tuple of forcing vectors

    :return: output variables of C# methods, or None
    """
    process = Process.start(
        ["/usr/bin/mono", f'{__path__[0]}/../bin/kernel.exe'], 
        config
    )
    
    for item in forcing:
        process.send(item)  # send data as serialized dictionary
        [state] = process.receive(1)
        process.result.append(state)
        if state["status"] == "error":
            Message(
                message="Runtime", 
                data=state["message"]
            ).log(process.log)
            break

    return process.result, process.log.getvalue().decode()

app = App(__name__, options={"swagger_ui": False})

CORS(app.app)
parser = ResolvingParser(
    str(Path("openapi/api.yml").absolute()), 
    lazy=True,
    strict=True
)
parser.parse()
app.add_api(
    parser.specification, 
    base_path="/api",
    validate_responses=False
)
