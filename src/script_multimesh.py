from bathysphere.mesh import Graph

directory = './data/mesh/'
host = "bolt://localhost:7687"
meshes = [{"name": "Midcoast Maine", "path": directory+'midcoast_nodes.csv'},
          {"name": "Gulf of Maine", "path": directory+'necofs_gom3_mesh.nc'}]

for each in meshes:
    graph = Graph(host, auth=None, name=each["name"])
    graph.nodes(each["path"])
