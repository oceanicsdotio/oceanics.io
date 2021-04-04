#!/bin/bash
export PROJECT=lyrical-shore-270522
echo "Deleting instance and firewall rules"
gcloud compute instances delete --quiet bathysphere --project "$PROJECT" && gcloud compute firewall-rules --quiet delete bathysphere --project "$PROJECT"
exit $?