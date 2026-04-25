import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { createWorker, HTTPMethods, respond, WorkerTasks } from "./utils";
import { StripeWebhookEvent } from "./worker";


export const stripeWebhookHandler  = async (
  req: APIGatewayProxyEventV2,
  context: Context,
  method: HTTPMethods
) => {
  const response = await createWorker({ task: WorkerTasks.StripeWebhook, event: req.body })
  return respond(response.StatusCode ?? 200, {message: 'accepted'} ); 
}