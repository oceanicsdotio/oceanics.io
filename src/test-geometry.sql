CREATE TABLE locations_polygon(id INT PRIMARY KEY, name VARCHAR(100), geo geography);
INSERT INTO locations_polygon (id, name, geo)
  VALUES (1,'test-shape','POLYGON((0.0 45.0, 45.0 45.0, 45.0 0.0, 0.0 0.0, 0.0 45.0))');
SELECT id, name, ST_AsGeoJSON(geo) FROM locations_polygon;
DROP TABLE locations_polygon;

CREATE TABLE test_locations(id INT PRIMARY KEY, name VARCHAR(100) NULL, geo GEOGRAPHY NOT NULL);
INSERT INTO test_locations (id, name, geo)
VALUES (0.0, 'location-0', ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[0, 45], [45.038174710287265, 45.309266030705956], [45.48245294803651, 0.7285332426056125], [0.5056775119023585, 0.5068888398475498], [0, 45]]], "crs": {"type": "name", "properties": {"name": "EPSG:4326"}}}'));
