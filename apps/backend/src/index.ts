import { APIGatewayProxyResult, Context, Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

type LambdaHttpEvent = {
  httpMethod: string;
  path: string;
  body?: string | null;
};
const AddProduct = async (tableName: string, product: { id: string; name: string; price: number }) => {
      await dynamodb.send(
        new PutCommand({
          TableName: tableName,
          Item:product,
        }),
      );
  }

  const getProducts = async (tableName: string) => {
    const result = await dynamodb.send(new ScanCommand({ TableName: tableName }));
    return result.Items;
  }

  const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
  });

export const handler: Handler<LambdaHttpEvent, APIGatewayProxyResult> = async (
  event,
  context: Context,
) => {
  const tableName = process.env.TABLE_NAME!;
  if(event.path === '/products'){
    if (event.httpMethod === 'GET') {
      try {
        const products = await getProducts(tableName);

        return response(200, products);
      } catch (error) {
        console.error('Error fetching products:', error);
        return response(500, { message: 'Error fetching products' });
      }
    }
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return response(400, { message: 'Missing request body' });
      }
      try {
        const body = JSON.parse(event.body);
        await AddProduct(tableName, body);
        return response(201, { message: 'Product added successfully' });
      } catch (error) {
        console.error('Error adding product:', error);
        return response(500, { message: 'Error adding product' });
      }
    }
  }
  if(event.path === '/contacts' && event.httpMethod === 'POST'){
    if (!event.body) {
      return response(400, { message: 'Missing request body' });
    }
    // waiting on zoho api docs to implement contact creation, will add code here to create a contact in zoho crm when this endpoint is hit 
    console.log('adding a new contact')

  }

  return response(404, { message: 'Not Found' });
  
}

