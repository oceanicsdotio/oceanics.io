from neritics.physics import Wind
from bathysphere.gx.agg import TimeView
from unittest import TestCase, main

LAYERS = 10
DEPTH = 10


class TestWindForcingSystem(TestCase):

    def setUp(self):

        self.wind = Wind()

    def test_simple_aeration_model(self):

        wind = self.wind
        a = wind.mixing(speed=2, minimum=0.0, simple=True, dt=None, kwargs=None)
        b = wind.mixing(speed=8, minimum=0.0, simple=True, dt=None, kwargs=None)

        assert b > a

    def test_plot_with_update(self):

        view = TimeView()

        wind = Wind(speed=0.0, delta=0.01, minimum=0.0)
        dt = 1/24
        time = [0.0]
        series = [0.0]

        for ii in range(24*60):
            time.append(time[-1] + dt)
            series.append(wind.mixing(dt=dt))

        view.plot(time, series)
        view.push("db/images/test_wind.png", ylab="Mixing", yloc=1, xlab="Time")


if __name__ == "__main__":
    main()
