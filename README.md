# Serverless App Template

This is a monorepo containing a React frontend, AWS Lambda backend, and CloudFormation infrastructure.

## Structure

- `apps/frontend`: React app with TypeScript and Vite
- `apps/backend`: AWS Lambda functions
- `infra/`: CloudFormation templates

## Setup

1. Install pnpm if not already installed.
2. Run `pnpm install` at the root.
3. For frontend: `cd apps/frontend && pnpm dev`
4. For backend: `cd apps/backend && pnpm build`
5. Deploy infrastructure: Use AWS CLI to deploy the CloudFormation template in `infra/template.yaml`

## Deployment

- Build the frontend: `cd apps/frontend && pnpm build`
- Upload the `dist` folder to the S3 bucket.
- Package and deploy the Lambda functions.

```cloudformation deploy --template-file infra/template.yaml --stack-name test-stack```