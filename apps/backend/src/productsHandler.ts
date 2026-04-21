import { APIGatewayProxyEventV2 } from "aws-lambda"
import { Context } from "vm"
import { getAccessToken, type HTTPMethods, respond } from "./utils"
import { DynamoDBClient, } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand} from "@aws-sdk/lib-dynamodb";
export const productsHandler = async ( 
    req: APIGatewayProxyEventV2,
    _: Context,
    method: HTTPMethods) =>{
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
    const tableName = process.env.TABLE_NAME!;
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

if (method === 'GET') {
      try {
        const products = await getProducts(tableName);

        return respond(200, products);
      } catch (error) {
        console.error('Error fetching products:', error);
        return respond(500, { message: 'Error fetching products' });
      }
    }
    if (method === 'POST') {
      if (!req.body) {
        return respond(400, { message: 'Missing request body' });
      }
      try {
        const body = JSON.parse(req.body);
        await AddProduct(tableName, body);
        return respond(201, { message: 'Product added successfully' });
      } catch (error) {
        console.error('Error adding product:', error);
        return respond(500, { message: 'Error adding product' });
      }
    }
    if(method === 'PUT'){
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
              return respond(200, { message: 'No products found in Zoho' });
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
            return respond(200, { message: 'Synced with Zoho successfully' });
        
          } catch (error: any) {
            console.error('Sync failed:', error);
        
            if (error instanceof Response) {
              const body = await error.text();
              console.error('Zoho error body:', body);
            }
        
            return respond(500, { message: 'Error syncing with Zoho' });
          }
    }
    return;
}