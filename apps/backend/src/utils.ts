import { APIGatewayProxyResult } from "aws-lambda";

export const respond = (statusCode: number, body: any, headers?: Record<string, string>): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*', // change this to your frontend domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
});

export type HTTPMethods = 'GET' | 'OPTION' | 'POST' | 'PUT';

export const getAccessToken = async () => {
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN!;
  const clientId = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;
  const tokenUrl = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
    const response: { access_token: string } = await fetch(tokenUrl, {
      method: 'POST',
    }).then(res => res.ok ? res : Promise.reject(res))
    .then(res => res.json() as Promise<{ access_token: string }>);
    
    return response.access_token;

}
