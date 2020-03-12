// Create vertex nodes
USING PERIODIC COMMIT
LOAD CSV FROM "file:///mesh_nodes_.csv" AS line
CREATE (:Node { id: toInt(line[0]), latitude: toFloat(line[1]), longitude: toFloat(line[2]), depth: toFloat(line[3]) })