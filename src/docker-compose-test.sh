#!/usr/bin/env bash
docker-compose build bathysphere-graph
docker-compose run --entrypoint="./src/pytest.sh" bathysphere-graph
docker-compose down