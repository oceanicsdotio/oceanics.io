import pytest

def test_native_class_from_struct():
    from ..bathysphere import Agent, Asset, Link
    from ..models import Agents, Assets

    agent = Agent(name="hello")
    asset = Asset(name="extenty thing", description=None)
    asset.getenv()

    link = Link(label="HAS")
    query = link.drop(repr(Agents(name="hello world")), repr(Assets(name="money")))

    print(query.query, query.read_only)

    assert agent.name == "hello"
