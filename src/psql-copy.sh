#!/usr/bin/env bash
psqlCopy () {
    PGPASSWORD=${PG_PASSWORD} psql \
    --echo-queries \
    --username=bathysphere \
    --host=${PG_HOST} \
    --port=${PG_PORT} \
    --dbname=${PG_DATABASE} \
    --command="\copy landsat_points (longitude, latitude, oyster_suitability_index) FROM '$1' WITH DELIMITER ',' CSV $2"
}

ingestShape () {
    shp2pgsql -I $1 $2 | \
        PGPASSWORD=${PG_PASSWORD} psql \
        --quiet \
        --username=bathysphere \
        --host=${PG_HOST} \
        --port=${PG_PORT} \
        --dbname=${PG_DATABASE}
}

echo Splitting file...
split -l 2000000 xyz.csv xyz-;
parts=$(ls xyz-*);
echo Uploading ${parts}...
count=0;
for part in ${parts}; do
    if [[ ${count}==0 ]]; then
        psqlCopy ${part} HEADER;
    else
        psqlCopy ${part};
    fi
    count=$((count + 1));
    rm ${part};
done

