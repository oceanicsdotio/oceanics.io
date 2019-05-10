from bathysphere.mesh import Mesh
from bathysphere.mesh import Nodes
from numpy import arange, int16

directory = './data/mesh/'
host = "bolt://localhost:7687"
mesh = {"name": "Midcoast Maine", "path": directory+'midcoast_nodes.csv'}

graph = Mesh.find(subgraph=mesh["name"])

pts = Nodes.load(mesh["path"])
config = {"data": pts, "bs": 1, "cls": "Node", "resume": 0, "end": 1}
paging = graph.nodes(**config)


indices = arange(0, 100, dtype=int16)
graph._batch("Node", pts, )
graph.purge(auto=True)