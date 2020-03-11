from neritics.physics import Light
from bathysphere.gx.agg import TimeView
from datetime import datetime, timedelta
from numpy import ones, arange, hstack, array
from unittest import TestCase, main

LAYERS = 10
DEPTH = 10
TEST_IMAGE = "db/images/test_light.png"


class TestLightSystem(TestCase):
    @classmethod
    def setUpClass(cls):

        cls.z = DEPTH * ones(3)  # three vertices to define a cell
        cls.sigma = arange(LAYERS+1) / LAYERS
        cls.depth = cls.sigma[None, :] * cls.z[:, None]

    def setUp(self):
        """Northern Latitudes"""
        lat = (30, 45, 60)
        self.lights = tuple(Light(each) for each in lat)

    def test_low_level_methods_period_winter_noon(self):
        """Low-level use of latitude variation works for period"""

        tt = datetime(2018, 2, 1, 12, 0, 0).timetuple()  # winter noon
        period = tuple(each._daylight(tt.tm_yday, each._latitude) for each in self.lights)

        last = 1.0
        for each in period:
            self.assertTrue(each < last)
            last = each

    def test_low_level_methods_source_spring_morning(self):
        """Low-level use of latitude variation works for intensity"""
        amp = 650
        tt = datetime(2018, 4, 1, 10, 0, 0).timetuple()  # spring noon, after equinox
        dec_time = (tt.tm_hour + (tt.tm_min + tt.tm_sec / 60) / 60) / 24
        period = tuple(each._daylight(tt.tm_yday, each._latitude) for each in self.lights)
        source = tuple(self.lights[ii]._par(dec_time, period[ii], amp) for ii in range(3))

        last = 0.0
        for each in source:
            self.assertTrue(each > last)
            last = each

    def test_high_level_object_creation(self):
        """Can automatically create and update lights"""
        ts = datetime(2018, 2, 1, 12, 0, 0)
        assert all(each._update(ts) for each in self.lights)
        print("\nLatitude\tPeriod\tSource")

        for each in self.lights:
            print(each._latitude, "\t", each._period, "\t", each._surface)

        print()

    @staticmethod
    def single_lat(view, light, time):

        series = []
        for ts in time:
            light._update(ts)
            series.append(light._surface)

        view.plot(time, series, label="Lat=" + str(light._latitude))

    def test_plot_series_annual(self):

        view = TimeView()
        time = datetime(2018, 1, 1, 10, 0, 0) + array([timedelta(days=ii) for ii in range(365)])
        lat = (30, 45, 60)
        lights = tuple(Light(each) for each in lat)

        for each in lights:
            self.single_lat(view, each, time)

        view.push("db/images/test_light_year.png", ylab="Intensity (10:00)", yloc=100, xlab="Date", xloc=90)

    def test_plot_series_daily(self):

        view = TimeView()
        time = datetime(2018, 4, 1, 0, 0, 0) + array([timedelta(minutes=ii) for ii in range(24*60)])
        lat = (30, 45, 60)
        lights = tuple(Light(each) for each in lat)

        for each in lights:
            self.single_lat(view, each, time)

        view.push("db/images/test_light_day.png", ylab="Intensity (10:00)", yloc=100, xlab="Time", xloc=1)

    def test_depth_attenuation(self):
        """Attenuation does not fail"""
        ts = datetime(2018, 2, 1, 12, 0, 0)
        results = hstack(tuple(each.attenuate(ts, self.depth)[0, :].reshape(-1, 1) for each in self.lights))
        print(results)


if __name__ == "__main__":
    main()


