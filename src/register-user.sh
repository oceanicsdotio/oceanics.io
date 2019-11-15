#!/usr/bin/env bash
curl -i -X POST -H "Content-Type: application/json" -d '{"$":"service-account","password":"n0t_passw0rd"}' http://localhost:5000/users
export TOKEN=$(curl -u ${USER}:${PASS} -i -X GET http://${HOST}:${PORT}/token | grep -E ${KEY} | sed 's/'${KEY}'//g' | sed 's/[": ]//g')
curl -u ${TOKEN}:x -i -X GET http://${HOST}:${PORT}/test
