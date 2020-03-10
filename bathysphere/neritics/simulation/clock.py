from neritics.simulation.clock.defaults import SEC2DAY
from numpy import floor

SEC2DAY = 86400

class Clock:
    def __init__(self, start, dt):
        """
        Timekeeper object with integer clock

        :param start: Start time in integer seconds
        :param dt: Time step in integer seconds
        """
        self.dt = dt
        self.start = start
        self.elapsed = 0

        days = start / SEC2DAY  # current time in days
        self.time = days % 1  # time of day as fraction
        self.yd = days % 365
        self._next = self._days() + SEC2DAY
        self.SEC2DAY = SEC2DAY

    def _days(self):

        return floor((self.start + self.elapsed) / SEC2DAY)

    def tick(self, dt=None):
        """
        Update clock

        :param dt: Optional parameter to assign new time step (integer seconds)
        :return: None
        """
        if dt is not None:
            self.dt = dt

        self.elapsed += self.dt
        days = self._days()

        self.time = days % 1.0
        self.yd = days % 365.0

    def flag(self):
        now = self._days()
        if now > self._next:
            self._next = now + SEC2DAY
            return True
        else:
            return False

    @staticmethod
    def sec2day():
        return SEC2DAY
