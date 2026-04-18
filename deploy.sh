#!/usr/bin/env bash

set -a            # automatically export all variables
source ./.env
set +a           # disable automatic exporting
set -e
# check if Site is set
if [ -z "$Site" ]; then
  echo "Error: Site variable is not set. Please set the Site variable and try again."
  exit 1
fi
aws cloudformation package --template-file infra/template.yaml --s3-prefix "$Site" --s3-bucket openlaunchworks-infra-bucket --output-template-file packaged-template.yaml
aws cloudformation deploy \
  --template-file packaged-template.yaml \
  --stack-name "$Site-stack" \
  --parameter-overrides \
    UseCustomDomain=true  \
    DomainName="$Site".com \
    ZOHOCLIENTID="$ZOHO_CLIENT_ID" \
    ZOHOCLIENTSECRET="$ZOHO_CLIENT_SECRET" \
    ZOHOACCESSTOKEN="$ZOHO_ACCESS_TOKEN" \
    ZOHOREFRESHTOKEN="$ZOHO_REFRESH_TOKEN" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND


# capture lambda function url from stack then update frontend config with it
export VITE_API_URL=$(aws cloudformation describe-stacks --stack-name "$Site-stack" --query "Stacks[0].Outputs[?OutputKey=='LambdaAPIUrl'].OutputValue" --output text)  
 echo aws cloudformation describe-stacks --stack-name "$Site-stack" --query "Stacks[0].Outputs[?OutputKey=='Nameservers'].OutputValue" --output text  
  #upload site to s3 bucket
cd apps/frontend && npm run build
#empty the bucket before uploading new files
aws s3 rm s3://"$Site-stack-hosting-bucket" --recursive

aws s3 sync dist/ s3://"$Site-stack-hosting-bucket" --delete 

#call update function to populate products on first deploy
curl -X POST "$VITE_API_URL/update"

## set up notification for change in products to hit the lambda function update url.
#need a new scope for this: ZohoBigin.notifications.ALL
# export tempToken=$(curl -sSX POST "https://zohoapis.com/oauth/v2/token?refresh_token=$ZOHO_REFRESH_TOKEN&client_id=$ZOHO_CLIENT_ID&client_secret=$ZOHO_CLIENT_SECRET&grant_type=refresh_token" -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')
# curl -X POST https://zohoapis.com/bigin/v2/actions/watch \
#   -H "Authorization: Zoho-oauthtoken $tempToken" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "notify_url": "https://'"$VITE_API_URL"'/update",
#     "events": [
#         "Products.ALL"
#     ],
#     "channel_id": "'"$Site"'"
# }'