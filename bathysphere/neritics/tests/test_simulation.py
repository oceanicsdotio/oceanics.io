from neritics.simulation import Simulation
from neritics.chemistry.organic import Carbon, Oxygen
from neritics.chemistry.nutrient import Nitrogen, Phosphorus

c = Carbon()
o = Oxygen()
n = Nitrogen()
p = Phosphorus()

systems = {each.key: each for each in [c, o, n, p]}

start = 0
dt = 60*60
latitude = 45
sim = Simulation(start, dt, latitude, systems, mesh=None)



