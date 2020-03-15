import click
from functools import partial
from subprocess import run
from time import sleep
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
def start(port: int):
    """
    Command to start the graph database access service.
    """
    click.echo(f"gunicorn bathysphere.graph:app --bind 0.0.0.0:{port}")


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


@click.command()
def test():
    """
    Command to run developer tests.
    """
    click.echo("pytest")


@click.command()
@click.option("--service", default='', help="Docker image")
def build(service: str) -> None:
    """
    Build images.
    """
    click.echo(f"docker-compose build {service}")


@click.command()
@click.option("--service", default='', help="Docker image")
def up(service: str) -> None:
    """
    Build images.
    """
    click.echo(f"docker-compose up -d {service}")

@click.command()
def neo4j() -> None:
    """
    Build images.
    """
    run(["docker-compose", "up", "-d", "neo4j"])
    sleep(5)
    run(["sensible-browser", "localhost:7474/browser"])
    


@click.command()
@click.argument("source")
@click.argument("particle_type")
@click.option("--out", default="./particles.csv", help="Output target")
@click.option("--mode", default="w+", help="Write(w+) or Append(a)")
def parse_ichthyotox(source: str, particle_type: str, out: str, mode: str):
    """
    Convert lagrangian particle data stored in table format to a format
    for ingestion into the databases
    """
    from csv import writer
    from pathlib import Path
    from os import listdir

    path = Path(source)
    total = 0
    with open(out, mode) as target:
        csv = writer(target, delimiter=',')
        for simulation in listdir(str(path.absolute())):
            try:
                _ = int(simulation)
            except ValueError:
                continue
            filename = "/".join((str(path.absolute()), simulation, source))
            try:
                lines = list(reversed(open(filename, "r").readlines()))
            except FileNotFoundError:
                continue
            while lines:
                q = list(map(str.strip, lines.pop().split()))
                t = q[0]
                q = q[1:]
                records = []
                while q:
                    pid, x, y, z = q[:4]
                    records.append([simulation, particle_type, t, pid, f"POINT({x} {y} {z})"])
                    q = q[4:]

                subtotal = len(records)
                total += subtotal
                csv.writerows(records)
            click.echo(f"Simulation {simulation} yielded {subtotal} {particle_type} records")
   
    click.echo(f"Processed {total} total {particle_type} records")




cli.add_command(redis_worker)
cli.add_command(serve_spec)
cli.add_command(start)
cli.add_command(parse_ichthyotox)
cli.add_command(build)
cli.add_command(up)
cli.add_command(neo4j)

if __name__ == "__main__":
    cli()