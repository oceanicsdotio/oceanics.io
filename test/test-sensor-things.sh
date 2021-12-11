TOKEN=$(curl --header "Content-Type: application/json" \
  --header "Authorization: test@oceanics.io:n0t_p@55w0rd:salt" \
  --request GET \
  http://localhost:8888/api/auth | jq -r .token)

# curl --header "Content-Type: application/json" \
#   --header "Authorization: bearer:${TOKEN}" \
#   --request POST \
#   --data '{"name":"Lloigor"}' \
#   http://localhost:8888/.netlify/functions/sensor-things?node=Things | jq

# Get all Node Index
curl --header "Content-Type: application/json" \
  --header "Authorization: bearer:${TOKEN}" \
  --request GET \
  "http://localhost:8888/api/" | jq

# Get all Nodes of a single type
curl --header "Content-Type: application/json" \
  --header "Authorization: bearer:${TOKEN}" \
  --request GET \
  "http://localhost:8888/api/Things" | jq

# Get a single node with a valid UUID
curl --header "Content-Type: application/json" \
  --header "Authorization: bearer:${TOKEN}" \
  --request GET \
  "http://localhost:8888/api/Things(5e205dad8de845c89075c745e5235b05)" | jq

