#!/usr/bin/env bash
rq worker -u redis://:${REDIS_HOST}:${REDIS_PORT}/0
