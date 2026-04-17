import {  APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResult, Context,  } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);


type ZOHOProduct =  {
      "Product_Name": string,
      "id": string,
      "Unit_Price": number,
      "Product_Active"?: boolean,
      "Product_Code"?: string,
      "Modified_Time"?: string,
      "$taxable"?: boolean
    }
const getProductImage = async (productId: string, accessToken: string): Promise<string> => {
  const response = await fetch(`https://zohoapis.com/bigin/v2/Products/${productId}/photo`, {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  });

  const imageBuffer = await response.arrayBuffer();
  // You can now upload this buffer to S3 or convert to Base64
  return Buffer.from(imageBuffer).toString('base64');

}
const getAccessToken = async () => {
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
const AddProduct = async (tableName: string, product: ZOHOProduct & { photo: string }) => {
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

  const response = (statusCode: number, body: any, headers?: Record<string, string>): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
      ...headers,
    },
  });

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  const {method, path } = event.requestContext.http;
  const tableName = process.env.TABLE_NAME!;
  if(path === '/products'){
    if (method === 'GET') {
      try {
        const products = await getProducts(tableName);

        return response(200, products);
      } catch (error) {
        console.error('Error fetching products:', error);
        return response(500, { message: 'Error fetching products' });
      }
    }
    if (method === 'POST') {
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
  if(method === 'OPTIONS'){
    return response(200, { message: 'OK' }, {
      'Access-Control-Allow-Origin': '*', // change this to your frontend domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }
  if(path === '/contacts' && method === 'POST'){
    if (!event.body) {
      return response(400, { message: 'Missing request body' });
    }
    const {Last_Name, Email} = JSON.parse(event.body);
    if(!Last_Name){
      return response(400, { message: 'Last_Name is required' });
    }
    // waiting on zoho api docs to implement contact creation, will add code here to create a contact in zoho crm when this endpoint is hit 
   try{
    const result = await fetch('https://www.zohoapis.com/bigin/v2/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [event.body] })
    });
    return response(201, { message: 'Contact creation triggered' });
  }catch(error: any){
    console.error('Error creating contact in Zoho:', error);
    return response(500, { message: error.message || 'Error creating contact in Zoho' });
  }
    
  }
 if (path === '/update') {
  console.log('Starting Zoho → DynamoDB sync ');

  try {
    const accessToken = await getAccessToken();
    const bearerToken = `Zoho-oauthtoken ${accessToken}`;

    const url =
      'https://www.zohoapis.com/bigin/v2/Products?per_page=200&fields=id,Product_Name,Unit_Price,Description';

    console.log('Fetching Zoho products ...');

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: bearerToken },
    });

    // If Zoho returns an error, log the body
    if (!res.ok) {
      const body = await res.text();
      console.error(`Zoho error (HTTP ${res.status}):`, body);
      throw new Error(`Zoho returned ${res.status}`);
    }


    let json: any;
    try {
      json = await res.json();
    } catch (err) {
      console.error('Failed to parse Zoho JSON:');
      throw err;
    }

    if (!json.data || json.data.length === 0) {
      console.log('Zoho returned no products');
      return response(200, { message: 'No products found in Zoho' });
    }

    console.log(`Fetched ${json.data.length} products from Zoho`);

    // Insert into DynamoDB
    for (const product of json.data) {
      if (!product.id) {
        console.error('Skipping product with missing id:', product);
        continue;
      }
      const backupImage = 'https://plus.unsplash.com/premium_vector-1737035301774-79613c87d8bb?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

      const item = {
        ...product,
        photo: await getProductImage(product.id, accessToken).then((url) => url || backupImage).catch(() => backupImage),
      };

      try {
        await dynamodb.send(
          new PutCommand({
            TableName: tableName,
            Item: item,
          })
        );
      } catch (err) {
        console.error('DynamoDB write failed for product:', product.id, err);
        throw err;
      }
    }

    console.log('Sync completed successfully');
    return response(200, { message: 'Synced with Zoho successfully' });

  } catch (error: any) {
    console.error('Sync failed:', error);

    if (error instanceof Response) {
      const body = await error.text();
      console.error('Zoho error body:', body);
    }

    return response(500, { message: 'Error syncing with Zoho' });
  }
}




  return response(404, { message: 'Not Found' });
  
}

