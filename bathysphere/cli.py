import click

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

@click.argument("port", help="Port to connect to")
def start(port: int):
    click.echo(f"gunicorn bathysphere_graph:app --bind 0.0.0.0:{port}")

cli.add_command(echo)

if __name__ == "__main__":
    cli()