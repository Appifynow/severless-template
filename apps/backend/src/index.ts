import {  APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResult, Context,  } from 'aws-lambda';
import { getAccessToken, HTTPMethods, respond } from './utils';
import { handler as stripeHander } from './stripeHandler';
import { productsHandler } from './productsHandler';
import { contactHandler } from './contactsHandler';


export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  let res;
  const {method, path } = event.requestContext.http;
  if(method === 'OPTIONS'){
    return respond(200, { message: 'OK' });
  }
  res = await stripeHander(event, context);
  
  
  if(path === '/products'){
    res = await productsHandler(event, context, method as HTTPMethods)
  }
  
  if(path === '/contacts'){
    res = await contactHandler(event, context, method as HTTPMethods)
  }
  if(!res) res = respond(404, { message: 'Not Found' });
  return res;
  
}

