import pytest
from numpy import arange, random

from bathysphere.views import Time
from bathysphere import app


@pytest.mark.dependency()
def test_scatter_plot_random():
    maximum = 10
    points = 365
    styles = app.app.config["styles"]

    view = Time(styles["dark"], extent=[0, 365, 0, maximum])

    for ii in range(3):
        series = random.random(points) * maximum
        view.plot(
            arange(points),
            series,
            **{
                "label": "Unnamed",
                "scatter": True,
                "alpha": 0.2,
                "marker": 2,
                "color": None,
            }
        )

    buffer = view.push(
        title="This is just a test",
        xlab="Days",
        ylab="Random",
        legend=False,
        yloc=1,
        xloc=10,
    )
    assert buffer.getvalue()


def test_coverage():

    time = random.random(1000) * 365
    styles = app.app.config["styles"]

    view = Time(styles["dark"], extent=[0, 365, 0, 2 * (1000 / 365)])
    view.coverage(time)

    buffer = view.push(
        title="This is just a test",
        xlab="Yearday",
        ylab="Observations",
        legend=False,
        yloc=1,
        xloc=10,
    )
    assert buffer.getvalue()


def test_frequency():
    series = random.random(100) * 10
    styles = app.app.config["styles"]

    view = Time(styles["dark"])
    view.frequency(series, lower=0.0, upper=10.0, bins=20)

    buffer = view.push(
        title="This is just a test",
        xlab="Value",
        ylab="Observations",
        legend=False,
        yloc=1,
        xloc=10,
    )
    assert buffer.getvalue()

