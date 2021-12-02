# MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"email":"test@oceanics.io","password":"n0t_p@55w0rd","secret":"salt","apiKey":"'$SERVICE_PROVIDER_API_KEY'"}' \
  http://localhost:8888/.netlify/functions/auth | jq

TOKEN=$(curl --header "Content-Type: application/json" \
  --header "Authorization: test@oceanics.io:n0t_p@55w0rd:salt" \
  --request GET \
  http://localhost:8888/.netlify/functions/auth | jq -r .token)

echo $TOKEN

