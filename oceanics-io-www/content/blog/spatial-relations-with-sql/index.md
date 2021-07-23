---
title: Spatial relationships with SQL
date: "2021-03-10T20:00:00.000Z"
description: |
    Postgis can be really fast for spatial interpolation. This isn't exactly rocket science,
    but here are some example queries and scripts for doing things like k-nearest neighbors
    with just a database and a cloud function. Extremely useful. 
tags: ["algorithms", "clustering", "data", "spatial", "postgis"]
---

We use a combination of databases and custom software to do geospatial analysis. This document provides some examples of data processing and ingestion to do point-based queries for data.

If you want, you can get the large (>1GB) NetCDF file here:
https://oceanicsdotio.nyc3.digitaloceanspaces.com/LC8011030JulyAvLGN00_OSI.nc

This file contains oyster suitability data aggregated over one month. It was synthesized by Jordan Snyder at the University of Maine.

We'll want a basic table of point observations:
```sql 
CREATE TABLE landsat_points(
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    oyster_suitability_index DOUBLE PRECISION,
    geo GEOGRAPHY
);
```

For simplicity, you can unpack NetCDF into CSV and use bulk imports. This is pretty easy in JavaScript and Python, but non trivial in, like, Fortran. You can end up with big files doing this. Split the file, and wrap the ingestion process as a bash function:

```bash
echo Splitting file...
split -l 2000000 xyz.csv xyz-;
parts=$(ls xyz-*);
echo Uploading ${parts}...
count=0;
for part in ${parts}; do
    if [[ ${count}==0 ]]; then
        yourBashFunction ${part} HEADER;
    else
        yourBashFunction ${part};
    fi
    count=$((count + 1));
    rm ${part};
done
```

Your ingestion function probably looks something like:

```bash
PGPASSWORD=${PG_PASSWORD} psql \
    --echo-queries \
    --username=${PG_USER} \
    --host=${PG_HOST} \
    --port=${PG_PORT} \
    --dbname=${PG_DATABASE} \
    --command="\copy landsat_points (longitude, latitude, oyster_suitability_index) FROM '$1' WITH DELIMITER ',' CSV $2"
```

Then you have to create `postgis` geometry from the lat and long, and build a spatial index on this:
```sql
UPDATE landsat_points
SET geo=ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geo IS NULL;
CREATE INDEX landsat_points_geo_idx ON landsat_points USING GIST(geo);
```

If you are pulling from an ESRI shapefile, learn `shp2pgsql`. This can even be used for a remote source. 

Once the points are ingested you do a bounding box query :
```sql
SELECT * FROM landsat_points AS points
WHERE st_within(geo::geometry, 'SRID=4326;POLYGON((-69.6 43.8, -69.5 43.8, -69.5 44.1, -69.6 44.1, -69.6 43.8))'::geometry);
```

Or, average nearby observations:
```sql
SELECT AVG(osi), COUNT(osi) FROM (
    SELECT osi FROM (
        SELECT oyster_suitability_index as osi, geo
        FROM landsat_points
        ORDER BY geo <-> 'POINT(-69.89196944 43.77643055)'
        LIMIT 24
    ) AS knn
    WHERE st_distance(geo, 'POINT(-69.89196944 43.77643055)') < 60
) AS points;
```

Or, get nearby observations:
```sql
SELECT osi, geo, st_distance(geo, 'POINT(-69.89196944 43.77643055)') as dxy FROM (
    SELECT oyster_suitability_index as osi, geo
    FROM landsat_points
    ORDER BY geo <-> 'POINT(-69.89196944 43.77643055)'
    LIMIT 24
) AS knn
WHERE st_distance(geo, 'POINT(-69.89196944 43.77643055)') < 20
```

With millions of points you can still resolve queries in under 100ms on a modest cloud Postgres instance! 