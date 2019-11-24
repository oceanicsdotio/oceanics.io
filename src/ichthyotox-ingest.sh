#!/usr/bin/env bash
split -l 2000000 fish_position.csv fish_position-;
parts=$(ls fish_position-*);
count=0;
for part in ${parts}; do
    PGPASSWORD=${PG_PASSWORD} psql \
    --echo-queries \
    --username=${PG_USERNAME} \
    --host=${PG_HOST} \
    --port=${PG_PORT} \
    --dbname=ichthyotox \
    --command="\copy fish_position (simulation, time, id, x, y, z) FROM '${part}' WITH DELIMITER ',' CSV"
    count=$((count + 1));
done