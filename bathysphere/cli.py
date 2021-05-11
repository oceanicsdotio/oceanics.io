"""
Bathysphere command line interface. 

This brings various scriptable processes into a single location.
"""
import click
from subprocess import run

@click.group()
def cli():
    pass


@click.command()
@click.option("--port", default=5000, help="Port on which to serve the API")
@click.option("--dev", default=False, help="")
def start(port: int, dev: bool):
    """
    Command to start the graph database access service.
    """
    click.secho(f"gunicorn bathysphere:app {'--reload' if dev else ''} --bind 0.0.0.0:{port}", fg="green")


@click.command()
@click.option("--kw", default=None, help="Pytest keyword string")
@click.option("--verbose", default=False, help="Print stuff")
@click.option("--parallel", default=False, help="Enable parallelism if subset of tests allows it")
def test(kw: str, verbose: bool, parallel: bool,):
    """
    Command to run developer tests. This uses `pytest-cov` and `pytest-parallel`.
    """
    parallelism = "--workers auto" if parallel else ""
    opt = f"-{'sv' if verbose else ''}k {kw}" if kw else ""
    cmd = f"pytest {parallelism} --cov-report html:htmlcov --cov=bathysphere {opt} --ignore=data"
    click.secho(cmd, fg="green")

   
cli.add_command(start)
cli.add_command(test)

if __name__ == "__main__":
    cli()