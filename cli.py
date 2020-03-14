import click
from functools import partial
from http.server import SimpleHTTPRequestHandler
from http.server import HTTPServer as BaseHTTPServer, SimpleHTTPRequestHandler
import os

from bathysphere import graph


@click.group()
def cli():
    pass


@click.command()
@click.option("--count", default=1, help="number of greetings")
@click.argument("name")
def hello(count, name):
    for _ in range(count):
        click.echo(f"Hello {name}!")


# @click.command()
# @click.argument("host", help="Redis provider")
# @click.argument("port", help="Port to connect to")
# def redis_worker(host: str, port: int):
#     click.echo(f"rq worker -u redis://:{host}:{port}/0")


@click.command()
@click.argument("port", help="Port to connect to")
def sttart(port: int):
    click.echo(f"gunicorn bathysphere/graph:app --bind 0.0.0.0:{port}")


# @click.command()
# @click.argument("driver", help="Port to connect to")
# def compile(driver: str):
#     click.echo(f"mcs -reference:bin/{driver}.dll -out:bin/kernel.exe src/kernel.cs src/json.cs")


@click.command()
@click.option("--port", default=8000, help="Port number")
def serve_spec():
    """
    Serve the ReDoc OpenAPI specification on the localhost
    """
    class HTTPHandler(SimpleHTTPRequestHandler):
        """This handler uses server.base_path instead of always using os.getcwd()"""
        def translate_path(self, path):
            path = SimpleHTTPRequestHandler.translate_path(self, path)
            relpath = os.path.relpath(path, os.getcwd())
            fullpath = os.path.join(self.server.base_path, relpath)
            return fullpath


    httpd = BaseHTTPServer(("", 8000), HTTPHandler)
    httpd.base_path = os.path.join(os.path.dirname(__file__), 'openapi')
  
    click.echo(f"Serving API specification @ http://localhost:{port}")
    httpd.serve_forever()


@click.command()
@click.option("--port", default=5000, help="Port number")
def serve_graph():
    """
    Serve the graph function locally
    """  
    click.echo(f"Serving graph function @ http://localhost:{port}")


cli.add_command(hello)
cli.add_command(serve_spec)
cli.add_command(serve_graph)
cli.add_command(start)

if __name__ == "__main__":
    cli()