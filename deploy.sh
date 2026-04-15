#!/usr/bin/env bash
# check if Stie is set
if [ -z "$Site" ]; then
  echo "Error: Site variable is not set. Please set the Site variable and try again."
  exit 1
fi
aws cloudformation package --template-file infra/template.yaml --s3-prefix "$Site" --s3-bucket openlaunchworks-infra-bucket --output-template-file packaged-template.yaml
aws cloudformation deploy --template-file packaged-template.yaml --stack-name "$Site-stack" 