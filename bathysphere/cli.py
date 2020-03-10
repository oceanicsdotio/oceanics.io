import click

@click.group()
def cli():
    pass

@click.command()
@click.option('--count', default=1, help='number of greetings')
@click.argument('name')
def echo(count, name):
    for _ in range(count):
        click.echo(f"Hello {name}!")

cli.add_command(echo)

if __name__ == '__main__':
    cli()