import click
from functools import partial
from http.server import SimpleHTTPRequestHandler

@click.group()
def cli():
    pass


@click.command()
@click.option("--count", default=1, help="number of greetings")
@click.argument("name")
def echo(count, name):
    for _ in range(count):
        click.echo(f"Hello {name}!")


@click.command()
@click.argument("host", help="Redis provider")
@click.argument("port", help="Port to connect to")
def redis_worker(host: str, port: int):
    click.echo(f"rq worker -u redis://:{host}:{port}/0")


@click.command()
@click.argument("port", help="Port to connect to")
def start(port: int):
    click.echo(f"gunicorn bathysphere_graph:app --bind 0.0.0.0:{port}")


@click.command()
@click.argument("driver", help="Port to connect to")
def compile(driver: str):
    click.echo(f"mcs -reference:bin/{driver}.dll -out:bin/kernel.exe src/kernel.cs src/json.cs")


@click.command()
def specification():
    Handler = partial(SimpleHTTPRequestHandler, directory='/openapi')
    httpd = Handler()
    click.echo("Serving API specification")
    httpd.serve_forever()

cli.add_command(echo)

if __name__ == "__main__":
    cli()