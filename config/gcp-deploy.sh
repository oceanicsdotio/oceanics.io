#!/bin/bash
export PROJECT=lyrical-shore-270522
export MACHINE=n1-standard-2
export DISK_TYPE=pd-ssd
export DISK_SIZE=8GB
export NEO4J_VERSION=3.5.16
export STACK_NAME=bathysphere
export IMAGE=neo4j-community-1-3-5-16-apoc
echo "Creating instance"
OUTPUT=$(gcloud compute instances create $STACK_NAME \
   --project $PROJECT \
   --image $IMAGE \
   --tags neo4j \
   --machine-type $MACHINE \
   --boot-disk-size $DISK_SIZE \
   --boot-disk-type $DISK_TYPE \
   --image-project launcher-public)
echo $OUTPUT
# Pull out the IP addresses, and toss out the private internal one (10.*)
IP=$(echo $OUTPUT | grep -oE '((1?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.){3}(1?[0-9][0-9]?|2[0-4][0-9]|25[0-5])' | grep --invert-match "^10\.")
echo "Discovered new machine IP at $IP"

echo NEO4J_URI=bolt://$IP:7687
echo STACK_NAME=$STACK_NAME
exit 0