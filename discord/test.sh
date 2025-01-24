# Note for testing this is hard coded to localhost:2053
SERVER_URL="http://localhost:2053"

# Approved
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"id": "12345", "url": "https://twitter.com/dogeai_gov/status/1882760329685582075"}' \
     ${SERVER_URL}/approved

# Rejected
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"id": "67890", "url": "https://twitter.com/dogeai_gov/status/1882760329685582075", "reason": "lokks like a scam to me"}' \
     ${SERVER_URL}/rejected
