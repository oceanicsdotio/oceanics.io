#!/usr/bin/env bash

count=0
retries=10
timeout=6
status="undefined"

while [ "$status" != *"healthy"* ]
do
    count=${count}+1
    if [ count -gt retries ]
    then
        echo "Neo4j status is ${status}, aborting"
        docker-compose down
        exit 1
    fi
    echo "Neo4j status is ${status}, waiting 5 seconds"
    sleep ${timeout}
    status=$(docker inspect --format='{{json .State.Health.Status}}' bathysphere-graph_neo4j_1)
done
echo "Neo4j status is ${status}, continuing with tests"
exit 0
