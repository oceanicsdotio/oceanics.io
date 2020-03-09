import click


@click.command()
def hello():
    click.echo("Hello world!")

if __name__ == '__main__':
    hello()