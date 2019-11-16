#!/usr/bin/env bash
docker-machine create \
--driver digitalocean \
--digitalocean-size s-2vcpu-4gb \
--digitalocean-access-token ${DOCKER_MACHINE_PAK} \
bathysphere-api-neo4j