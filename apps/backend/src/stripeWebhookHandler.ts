import { LambdaClient, InvokeCommand, InvocationType } from "@aws-sdk/client-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { Context } from "vm";
import { HTTPMethods, respond } from "./utils";
import type { StripeWebhookEvent } from "./worker";


export const stripeWebhookHandler  = async (
  req: APIGatewayProxyEventV2,
  context: Context,
  method: HTTPMethods
) => {
  const site = process.env.DOMAIN
  const stackName = `${site}-stack`
  const FunctionName = `${stackName}-worker`
    if(!req.body){
      return respond(400, 'no body')
    }
    const client = new LambdaClient({});
    const command = new InvokeCommand({
    FunctionName: process.env.WORKER_ARN,
    InvocationType: InvocationType.Event,
    Payload: JSON.stringify(req.body),
    });

const response = await client.send(command);
return respond(response.StatusCode ?? 200, {message: 'accepted'} ); 
}