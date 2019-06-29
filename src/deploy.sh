#!/usr/bin/env bash
cd bathysphere-graph
docker-compose down
sleep 5
git pull
sh src/docker-test.sh
docker-compose up -d