import click
from functools import partial
from subprocess import run
from time import sleep
from json import dumps
from secrets import token_urlsafe
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
    click.secho(f"rq worker -u redis://:{host}:{port}/0", fg="green")


@click.command()
@click.option("--port", default=5000, help="Port to connect to")
def start(port: int):
    """
    Command to start the graph database access service.
    """
    click.secho(f"gunicorn bathysphere.graph:app --bind 0.0.0.0:{port}", fg="green")


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
  
    click.secho(f"Serving API specification @ http://localhost:{port}", fg="yellow")
    httpd.serve_forever()


@click.command()
def test():
    """
    Command to run developer tests.
    """
    cmd = f"pytest --cov-report html:cov_html --cov=bathysphere/graph/ -sk test_graph --ignore bathysphere/tests/future_tests"
    click.secho(cmd, fg="green")


@click.command()
@click.option("--service", default='', help="Docker image")
def build(service: str) -> None:
    """
    Build images.
    """
    click.secho(f"docker-compose build {service}", fg="green")


@click.command()
@click.option("--service", default='', help="Docker image")
def up(service: str) -> None:
    """
    Build images.
    """
    click.secho(f"docker-compose up -d {service}", fg="green")

@click.command()
def neo4j() -> None:
    """
    Build images.
    """
    run(["docker-compose", "up", "-d", "neo4j"])
    sleep(5)
    run(["sensible-browser", "localhost:7474/browser"])
    

@click.command()
@click.option("--host", default="localhost", help="Neo4j instance hostname")
@click.option("--port", default=7687, help="Neo4j instance `bolt` port")
def providers(host: str, port: int) -> None:
    """
    List the existing `Providers` and access credentials, and create any new ones
    that are listed in the application configuration (`bathysphere.yml`).

    This is the only way to show and create API keys. 
    """
    from os import getenv
    from bathysphere.graph.drivers import connect
    from bathysphere.graph.models import Providers
    from bathysphere.utils import loadAppConfig

    appConfig = loadAppConfig()
    secretKeyAlias = "NEO4J_ACCESS_KEY"
    accessKey = getenv(secretKeyAlias)
    if accessKey is None:
        raise EnvironmentError(
            f"{secretKeyAlias} should be available in local environment"
        )

    db = connect(host, port, accessKey)
    if db is None:
        return {"message": "no graph backend"}, 500

    existing = dict()
    existingDomains = set()
    for each in Providers.load(db):
        existing[each.name.lower().strip()] = each
        loggerData = {
            "name": each.name,
            "domain": each.domain,
            "apiKey": each.apiKey,
        }
        click.secho(dumps(loggerData), fg="yellow")

    existingDomains = set(p.domain for p in existing.values())
    existingKeys = set(existing.keys())

    count = 0
    for each in appConfig["Providers"]:

        p = Providers(
            tokenDuration=600,
            apiKey=token_urlsafe(64),
            **each["spec"]
        )
        
        if p.domain not in existingDomains  \
            and p.name.lower().strip() not in existingKeys:
        
            p.create(db)
            loggerData = {
                "name": p.name,
                "domain": p.domain,
                "apiKey": p.apiKey,
            }
            click.secho(dumps(loggerData), fg="blue")
            count += 1

    if count > 0:
        click.secho(f"Created {count} access methods, remember to save them!", fg="yellow")


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
            click.secho(f"Simulation {simulation} yielded {subtotal} {particle_type} records", fg="blue")
   
    click.secho(f"Processed {total} total {particle_type} records", fg="blue")


cli.add_command(redis_worker)
cli.add_command(serve_spec)
cli.add_command(start)
cli.add_command(parse_ichthyotox)
cli.add_command(build)
cli.add_command(up)
cli.add_command(neo4j)
cli.add_command(providers)
cli.add_command(test)


if __name__ == "__main__":
    cli()