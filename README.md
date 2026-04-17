# Serverless App Template

This is a monorepo containing a React frontend, AWS Lambda backend, and CloudFormation infrastructure.

## Structure

- `apps/frontend`: React app with TypeScript and Vite
- `apps/backend`: AWS Lambda functions
- `infra/`: CloudFormation templates

## Setup

1. Install npm if not already installed.
2. Run `npm install` at the root.
1. cp example.env -> .env
1. update $Site var with domain name (no TLD)
1. run npm build
5. Deploy infrastructure: npm deploy

# LEGwork things that still need to be down manually

1. gen long lasting token:
    1. register app in api-zoho.com
    1. goto `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBigin.modules.attachments.READ,ZohoBigin.notifications.ALL,ZohoBigin.modules.products.ALL,ZohoBigin.modules.contacts.WRITE&client_id=1000.T4OK2HQRCBW1WDE3QK34YX95496XHT&response_type=code&access_type=offline&redirect_uri=https://www.openlaunchworks.com//` EDit scope if more is needed
    1. use postman to post https://accounts.zoho.com/oauth/v2/token with grant_code (60 secs till code expires)
    1. save resulting refresh code in env vars

## Deployment

- Build the frontend: `cd apps/frontend && npm run build`
- Upload the `dist` folder to the S3 bucket.
- Package and deploy the Lambda functions.

```cloudformation deploy --template-file infra/template.yaml --stack-name test-stack```