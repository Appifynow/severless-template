import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const tableName = process.env.TABLE_NAME!;

  // 2 endpoints: get all products, a webhook to update products from crm,
  if (event.httpMethod === 'GET' && event.path === '/products') {
    try {
      const result = await dynamodb.send(new ScanCommand({ TableName: tableName }));
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
      await dynamodb.send(
        new PutCommand({
          TableName: tableName,
          Item: { id: body.id, name: body.name, price: body.price },
        }),
      );
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