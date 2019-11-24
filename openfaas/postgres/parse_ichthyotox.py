from csv import writer
from pathlib import Path
from os import listdir

data = "/Users/Keeney/Dropbox/Projects/2017_Ichthyotox/data/"
destination = "data/particles.csv"


def aggregate(source, particle, mode="w+"):

    path = Path(data)
    total = 0
    with open(destination, mode) as target:
        csv = writer(target, delimiter=',')
        for simulation in listdir(str(path.absolute())):
            try:
                _ = int(simulation)
            except ValueError:
                continue
            filename = "/".join((str(path.absolute()), simulation, source))
            try:
                lines = list(reversed(open(filename, "r").readlines()))
            except FileNotFoundError:
                continue
            while lines:
                q = list(map(str.strip, lines.pop().split()))
                t = q[0]
                q = q[1:]
                records = []
                while q:
                    pid, x, y, z = q[:4]
                    records.append([simulation, particle, t, pid, f"POINT({x} {y} {z})"])
                    q = q[4:]

                subtotal = len(records)
                total += subtotal
                csv.writerows(records)
            print(f"Simulation {simulation} yielded {subtotal} {particle} records")
    return total


rows = 0
for task in (
    {
        "source": "fish_position.dat",
        "particle": "fish",
        "mode": "w+"
    }, {
        "source": "cyanobacteria_position.dat",
        "particle": "cyanobacteria",
        "mode": "a"
    }
):
    rows += aggregate(**task)
print(f"Processed {rows} total records")
