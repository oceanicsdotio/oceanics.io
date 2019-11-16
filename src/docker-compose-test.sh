#!/usr/bin/env bash
docker-compose build bathysphere-graph
docker-compose run --entrypoint="./src/pytest.sh" bathysphere-graph
docker-compose down

docker context create local \
  --default-stack-orchestrator=swarm \
  --docker host=unix:///var/run/docker.sock