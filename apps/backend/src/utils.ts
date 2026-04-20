import { APIGatewayProxyResult } from "aws-lambda";

export const respond = (statusCode: number, body: any, headers?: Record<string, string>): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*', // change this to your frontend domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
});