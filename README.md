# Serverless App Template

This is a monorepo containing a React frontend, AWS Lambda backend, and CloudFormation infrastructure.

## Structure

- `apps/frontend`: React app with TypeScript and Vite
- `apps/backend`: AWS Lambda functions
- `infra/`: CloudFormation templates

## Setup

1. Install npm if not already installed.
2. Run `npm install` at the root.
3. For frontend: `cd apps/frontend && npm run dev`
4. For backend: `cd apps/backend && npm run build`
5. Deploy infrastructure: Use AWS CLI to deploy the CloudFormation template in `infra/template.yaml`

## Deployment

- Build the frontend: `cd apps/frontend && npm run build`
- Upload the `dist` folder to the S3 bucket.
- Package and deploy the Lambda functions.

```cloudformation deploy --template-file infra/template.yaml --stack-name test-stack```