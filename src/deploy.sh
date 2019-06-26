#!/usr/bin/env bash
docker-compose down
sleep 5
git pull
docker-compose run --entrypoint="./src/pytest.sh" bathysphere-graph
docker-compose up -d