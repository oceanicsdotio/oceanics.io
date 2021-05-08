import pytest

def test_native_class_from_struct():
    from ..bathysphere import Agent

    agent = Agent(name="hello")
    assert agent.name == "hello"
