#!/usr/bin/env bash
docker-compose down
sleep 5
git pull
docker-compose up -d