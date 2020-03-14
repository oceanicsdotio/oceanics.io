import click
from functools import partial
from http.server import SimpleHTTPRequestHandler
from http.server import HTTPServer as BaseHTTPServer, SimpleHTTPRequestHandler
import os


@click.group()
def cli():
    pass


@click.command()
@click.argument("host")
@click.argument("port")
def redis_worker(host: str, port: int):
    """
    Command to start a redis worker.
    """
    click.echo(f"rq worker -u redis://:{host}:{port}/0")


@click.command()
@click.option("--port", default=5000, help="Port to connect to")
def graph(port: int):
    """
    Command to start the graph database access service.
    """
    click.echo(f"gunicorn bathysphere.graph:app --bind 0.0.0.0:{port}")


@click.command()
@click.argument("driver")
def compile(driver: str):
    """
    Command to compile a binary library for the local machine.
    """
    click.echo(f"mcs -reference:bin/{driver}.dll -out:bin/kernel.exe src/kernel.cs src/json.cs")


@click.command()
@click.option("--port", default=8000, help="Port number")
def serve_spec(port: int):
    """
    Serve the ReDoc OpenAPI specification on localhost.
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


cli.add_command(redis_worker)
cli.add_command(compile)
cli.add_command(serve_spec)
cli.add_command(graph)

if __name__ == "__main__":
    cli()