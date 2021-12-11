TOKEN=$(curl --header "Content-Type: application/json" \
  --header "Authorization: test@oceanics.io:n0t_p@55w0rd:salt" \
  --request GET \
  http://localhost:8888/.netlify/functions/auth | jq -r .token)

curl --header "Content-Type: application/json" \
  --header "Authorization: bearer:${TOKEN}" \
  --request POST \
  --data '{"name":"Lloigor"}' \
  http://localhost:8888/.netlify/functions/sensor-things?node=Things | jq

curl --header "Content-Type: application/json" \
  --header "Authorization: bearer:${TOKEN}" \
  --request GET \
  http://localhost:8888/.netlify/functions/sensor-things?node=Things | jq

