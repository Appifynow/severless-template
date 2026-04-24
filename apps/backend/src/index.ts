import {  APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResult, Context,  } from 'aws-lambda';
import { HTTPMethods, respond } from './utils';
import { handler as stripeHander } from './stripeHandler';
import { productsHandler } from './productsHandler';
import { contactHandler } from './contactsHandler';
import { stripeWebhookHandler } from './stripeWebhookHandler';


export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  try {
  let res;
  const {method, path } = event.requestContext.http;
  if(method === 'OPTIONS'){
    return respond(200, { message: 'OK' });
  }
  if(path === '/checkout'){
    res = await stripeHander(event, context).catch(e=> respond(500, e))
  }
  
  
  if(path === '/products'){
    res = await productsHandler(event, context, method as HTTPMethods).catch(e=> respond(500, e))
  }
  
  if(path === '/contacts'){
    res = await contactHandler(event, context, method as HTTPMethods).catch(e=> respond(500, e))
  }
  if(path === '/stripe-webhook'){
    res = await stripeWebhookHandler(event, context, method as HTTPMethods).catch(e=> respond(500, e))
  }
  if(!res) res = respond(404, { message: 'Not Found' });
  return res;
}
 catch(e){
  return respond(500, e)
 }
  
}

