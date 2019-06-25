#!/usr/bin/env bash
docker-compose up -d neo4j
docker run -it --entrypoint="./src/pytest.sh" oceanicsdotio/bathysphere-graph
docker-compose down