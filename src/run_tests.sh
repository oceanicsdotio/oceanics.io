#!/usr/bin/env bash
docker-compose up -d neo4j
docker-compose run --entrypoint="./src/pytest.sh" bathysphere-graph
docker-compose down