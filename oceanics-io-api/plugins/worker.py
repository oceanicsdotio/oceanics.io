"""
The worker module encapsulates parallel and sequential task processing in a generic
way that can handle numerical libraries.
"""
# Lazy task execution
from asyncio import new_event_loop, set_event_loop

# Rust methods
from bathysphere.bathysphere import Message

# Calling other native packages
from subprocess import Popen, PIPE, STDOUT

# Logging
from io import TextIOWrapper, BytesIO  

# Combine logs into single buffer
from functools import reduce  # pylint: disable=unused-import

# Timestamping
from time import time  # pylint: disable=unused-import


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


def resolveTaskTree(task, loop=None):  # pylint: disable=invalid-name
    # typing: (Coroutine, BaseEventLoop) -> (tuple)
    """
    Recursively run and reduce asynchronous task tree, depth set at runtime.

    Returns an (index, <coroutine>) tuple.
    The process stops when the final inner method is evaluated.

    This is used internally by `metadata()`.
    """
    # note previous state
    close = loop is None

    # Create an event loop if necessary
    loop = loop or new_event_loop()
    set_event_loop(loop)

    # Run the task
    ii, inner = loop.run_until_complete(task)  # pylint: disable=invalid-name

    if close:
        loop.close()

    if inner is None:
        return (ii,)

    # Accumulator
    yields = []

    # Parse each leaf task result
    parse = lambda x: [ii, *((x,) if isinstance(x, int) else x)]

    while len(inner) > 0:
        yields.extend(map(parse, resolveTaskTree(inner.pop())))

    return yields



def run(body, client, objectKey):
    # typing: (dict, Minio, str) -> (dict, int)
    """
    Run the model using a versioned configuration.

    :param objectKey: identity of the configuration to use
    :param body: optional request body with forcing
    :param species: bivalve species string, in path:
    :param session: session UUID used to name experiment
    :param weight: initial seed weight
    :param client: storage client
    """
    try:
        config = load(client.get_object(
            bucket_name=getenv("BUCKET_NAME"),
            object_name=f"{getenv('SERVICE_NAME')}/{objectKey}.json"
        ))
        properties = config.get("properties")
    except S3Error:
        return f"Configuration ({objectKey}) not found", 404
    except Exception:  # pylint: disable=broad-except
        return f"Invalid configuration ({objectKey})", 500


    def job(config: dict, forcing: tuple) -> (tuple, bytes):
        """
        Execute single simulation with synchronous callback.

        :param config: simulation configuration
        :param forcing: tuple of forcing vectors

        :return: output variables of C# methods, or None
        """

        command = ["/usr/bin/mono", f'{__path__[0]}/../bin/kernel.exe']

        result = attr.ib(factory=list)

        console = JSONIOWrapper()
        output = JSONIOWrapper()

        Message(
            message=f"Spawned process {process.pid}",
            data=process.args
        ).log(log)

        result = [output.receive(), output.receive()]
        console.send(config)

        Message(
            message="Worker ready",
            data=f"expecting transactions"
        ).log(log)

        process = Popen(
            self.command,
            stdin=PIPE,
            stdout=PIPE,
            stderr=STDOUT,
            bufsize=1
        )

        console = JSONIOWrapper.console(process.stdin, log=log)
        output = JSONIOWrapper.output(process.stdout, log=log)

        for item in forcing:
            console.send(item)  # send data as serialized dictionary
            state = output.receive()
            process.result.append(state)
            if state["status"] == "error":
                Message(
                    message="Runtime",
                    data=state["message"]
                ).log(process.log)
                break

        Message(
            message="Worker done",
            data="completed transactions"
        ).log(log)

        process.kill()
        process.wait()
        console.text_io.close()
        output.text_io.close()

        return result, log.getvalue().decode()

    start = time()
    processes = min(cpu_count(), properties.get("workers", cpu_count()))

    with Pool(processes) as pool:

        configuration = {
            "species": species,
            "culture": cultureType,
            "weight": weight,
            "dt": properties.get("dt", 3600) / 3600 / 24,
            "volume": properties.get("volume", 1000.0),
        }
        forcing = body.get("forcing")
        stream = zip(repeat(configuration, len(forcing)), forcing)
        data, logs = zip(*pool.starmap(job, stream))
        self_link = f"{getenv('SERVICE_NAME')}/{client.session_id}"

        result = {
            "self": self_link,
            "configuration": f"{getenv('SERVICE_NAME')}/{objectKey}",
            "forcing": forcing,
            "data": data,
            "workers": pool._processes,
            "start": start,
            "finish": time(),
        }

    try:
        client.put_object(
            object_name=f"{client.session_id}.logs.json",
            data=reduce(lambda a, b: a + b, logs),
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="log",
                x_amz_meta_parent=client.session_id
            ).headers(),
        )

        client.put_object(
            object_name=f"{client.session_id}.json",
            data=result,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="experiment",
                x_amz_meta_parent=objectKey
            ).headers()
        )

        config["experiments"].append(result["self"])

        client.put_object(
            object_name=f"{objectKey}.json",
            data=config,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="configuration",
                x_amz_meta_parent=client.index
            ).headers()
        )
    except Exception:
        return f"Error saving results", 500

    return {"self": self_link}, 200
