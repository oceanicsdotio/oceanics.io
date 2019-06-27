#!/usr/bin/env bash
cd bathysphere-graph
docker-compose down
sleep 5
git pull
docker-compose build bathysphere-graph
docker-compose run --entrypoint="./src/pytest.sh" bathysphere-graph
docker-compose down
docker-compose up -d