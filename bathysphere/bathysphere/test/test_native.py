import pytest

def test_native_class_from_struct():
    from ..bathysphere import Agent, Asset

    agent = Agent(name="hello")
    asset = Asset(name="extenty thing", description=None)
    asset.getenv()

    assert agent.name == "hello"
