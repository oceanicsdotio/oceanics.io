#!/bin/bash
export PROJECT=lyrical-shore-270522
export STACK_NAME=bathysphere

echo "Creating firewall rules"
gcloud compute firewall-rules create "$STACK_NAME" \
    --allow tcp:7473,tcp:7474,tcp:7687 \
    --source-ranges 0.0.0.0/0 \
    --target-tags neo4j \
    --project $PROJECT
if [ $? -ne 0 ] ; then
   echo "Firewall failed."
   exit 1
fi