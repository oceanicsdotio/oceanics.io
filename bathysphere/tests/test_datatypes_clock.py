from bathysphere.datatypes import Clock
from bathysphere.image import Time


def test_short_clock():

    view = TimeView()
    clock = Clock(start=0, dt=60*10)

    elapsed = []
    time = []

    for _ in range(6*24*3):
        clock.tick()
        elapsed.append(clock.elapsed/clock)
        time.append(clock.time)

    view.plot(elapsed, elapsed, label="Elapsed")
    view.plot(elapsed, time, label="Time")

    view.push("db/images/test_short_clock.png", yloc=1)
