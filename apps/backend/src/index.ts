import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (event, context) => {

  // 2 endpoints: get all products, a webhook to update products from crm,
  if (event.httpMethod === 'GET' && event.path === '/products') {
    try {
      const result = await dynamodb.scan({ TableName: process.env.TABLE_NAME! }).promise();
      return {
        statusCode: 200,
        body: JSON.stringify(result.Items),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch products' }),
      };
    }
  }
  if (event.httpMethod === 'POST' && event.path === '/webhook') {
    try {
      const body = JSON.parse(event.body || '{}');
      // Process the webhook data and update DynamoDB accordingly
      await dynamodb.put({
        TableName: process.env.TABLE_NAME!,
        Item: { id: body.id, name: body.name, price: body.price },
      }).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Product updated successfully' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update product' }),
      };
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not Found' }),
  };

};