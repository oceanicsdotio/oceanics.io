curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"pattern":"lexicon","maxCost":1}' \
  http://localhost:8888/.netlify/functions/lexicon | jq
