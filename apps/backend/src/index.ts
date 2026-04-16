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
      "Product_Active": boolean,
      "Product_Code": string,
      "Modified_Time": string,
      "$taxable": boolean
    }
const getProductImage = async (productId: string, accessToken: string) => {
  const response = await fetch(`https://zohoapis.com{productId}/photo`, {
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

  const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
  });

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  const tableName = process.env.TABLE_NAME!;
  if(event.rawPath === '/products'){
    if (event.requestContext.http.method === 'GET') {
      try {
        const products = await getProducts(tableName);

        return response(200, products);
      } catch (error) {
        console.error('Error fetching products:', error);
        return response(500, { message: 'Error fetching products' });
      }
    }
    if (event.requestContext.http.method === 'POST') {
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
  if(event.rawPath === '/contacts' && event.requestContext.http.method === 'POST'){
    if (!event.body) {
      return response(400, { message: 'Missing request body' });
    }
    // waiting on zoho api docs to implement contact creation, will add code here to create a contact in zoho crm when this endpoint is hit 
    console.log('adding a new contact')

  }
  if(event.rawPath === '/update'){
    //for now i will make this endpoint to trigger a sync with zoho, in the future i want this to be a webhook
    console.log('syncing with zoho')
    try{
    const accessToken = await getAccessToken();
    const bearerToken = `Zoho-oauthtoken ${accessToken}`;
    const products = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'GET',
      headers: {
        Authorization: bearerToken,
      },
    }).then(res => res.ok ? res : Promise.reject(res)).then(res => res.json() as Promise<{ data: ZOHOProduct[] }>);

    for(const product of products.data){
      const photo = await getProductImage(product.id, accessToken);
      await AddProduct(tableName, { ...product, photo });
    }
    return response(200, { message: 'Synced with Zoho successfully' });
  }catch(error){
    console.error('Error syncing with Zoho:', error);
    return response(500, { message: 'Error syncing with Zoho' });

  }
}

  return response(404, { message: 'Not Found' });
  
}

