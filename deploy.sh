#!/usr/bin/env bash
set -a            # automatically export all variables
source .env
set +a            # disable automatic exporting
# check if Site is set
if [ -z "$Site" ]; then
  echo "Error: Site variable is not set. Please set the Site variable and try again."
  exit 1
fi
aws cloudformation package --template-file infra/template.yaml --s3-prefix "$Site" --s3-bucket openlaunchworks-infra-bucket --output-template-file packaged-template.yaml
aws cloudformation deploy \
  --template-file packaged-template.yaml \
  --stack-name "$Site-stack" \
  --parameter-overrides UseCustomDomain=false \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

# capture lambda function url from stack then update frontend config with it
export VITE_API_URL=$(aws cloudformation describe-stacks --stack-name "$Site-stack" --query "Stacks[0].Outputs[?OutputKey=='LambdaAPIUrl'].OutputValue" --output text)  
  #upload site to s3 bucket
cd apps/frontend && npm run build
aws s3 sync apps/frontend/dist/ s3://"$Site"-stack-hosting-bucket --delete   