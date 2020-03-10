from unittest import TestCase, main
from neritics.simulation.clock import Clock
from bathysphere.gx.agg import TimeView


class TestIntegerClock(TestCase):

    def test_short_clock(self):
        view = TimeView()
        clock = Clock(start=0, dt=60*10)

        elapsed = []
        time = []

        for ii in range(6*24*3):
            clock.tick()
            elapsed.append(clock.elapsed/clock.SEC2DAY)
            time.append(clock.time)

        view.plot(elapsed, elapsed, label="Elapsed")
        view.plot(elapsed, time, label="Time")

        view.push("db/images/test_short_clock.png", yloc=1)


if __name__ == "__main__":
    main()
