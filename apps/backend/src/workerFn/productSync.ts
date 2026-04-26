import zoho from './../zoho'
import { DynamoDBClient, } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand} from "@aws-sdk/lib-dynamodb";
 const client = new DynamoDBClient({});
    const dynamodb = DynamoDBDocumentClient.from(client);
        
        const getProductImage = async (productId: string, accessToken: string): Promise<string> => {
          return await fetch(`https://zohoapis.com/bigin/v2/Products/${productId}/photo`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
          }).then(async (resp): Promise<string> => {
              if(!resp.ok)
                return Promise.reject(resp.status)
              const imageBuffer = await resp.arrayBuffer();
              const contentType = resp.headers.get('content-type') || 'image/png';
              // You can now upload this buffer to S3 or convert to Base64
              const data = Buffer.from(imageBuffer).toString('base64');
              const url = `data:${contentType};base64,${data}`;
    return url;
 })
}
    const tableName = process.env.TABLE_NAME!;


export const SyncProducts = async () => {
  console.log("Starting Zoho → DynamoDB sync ");

  try {
    const accessToken = await zoho.getAccessToken();
    const bearerToken = `Zoho-oauthtoken ${accessToken}`;

    const url =
      "https://www.zohoapis.com/bigin/v2/Products?per_page=200&fields=id,Product_Name,Unit_Price,Description";

    console.log("Fetching Zoho products ...");

    const res = await fetch(url, {
      method: "GET",
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
      console.error("Failed to parse Zoho JSON:");
      throw err;
    }

    if (!json.data || json.data.length === 0) {
      console.log("Zoho returned no products");
      return; 
    }

    console.log(`Fetched ${json.data.length} products from Zoho`);

    // Insert into DynamoDB
    for (const product of json.data) {
      if (!product.id) {
        console.error("Skipping product with missing id:", product);
        continue;
      }
      const backupImage = "https://placehold.co/300x200?text=No+Image";

      const item = {
        ...product,
        photo: await getProductImage(product.id, accessToken)
          .then((url) => url || backupImage)
          .catch(() => backupImage),
      };

      try {
        await dynamodb.send(
          new PutCommand({
            TableName: tableName,
            Item: item,
          })
        );
      } catch (err) {
        console.error("DynamoDB write failed for product:", product.id, err);
        throw err;
      }
    }

    console.log("Sync completed successfully");
    return;
  } catch (error: any) {
    console.error("Sync failed:", error);

    if (error instanceof Response) {
      const body = await error.text();
      console.error("Zoho error body:", body);
    }

    return;
  }
};
