import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { createWorker, type HTTPMethods, respond, WorkerTasks } from "./utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
export const productsHandler = async (
  req: APIGatewayProxyEventV2,
  _: Context,
  method: HTTPMethods
) => {
  type ZOHOProduct = {
    Product_Name: string;
    id: string;
    Unit_Price: number;
    Product_Active?: boolean;
    Product_Code?: string;
    Modified_Time?: string;
    $taxable?: boolean;
  };
  const client = new DynamoDBClient({});
  const dynamodb = DynamoDBDocumentClient.from(client);

  const AddProduct = async (
    tableName: string,
    product: ZOHOProduct & { photo: string }
  ) => {
    await dynamodb.send(
      new PutCommand({
        TableName: tableName,
        Item: product,
      })
    );
  };
  const tableName = process.env.TABLE_NAME!;

  const getProducts = async (tableName: string) => {
    const result = await dynamodb.send(
      new ScanCommand({ TableName: tableName })
    );
    return result.Items;
  };

  if (method === "GET") {
    try {
      const products = await getProducts(tableName);

      return respond(200, products);
    } catch (error) {
      console.error("Error fetching products:", error);
      return respond(500, { message: "Error fetching products" });
    }
  }
  if (method === "POST") {
    if (!req.body) {
      return respond(400, { message: "Missing request body" });
    }
    try {
      const body = JSON.parse(req.body);
      await AddProduct(tableName, body);
      return respond(201, { message: "Product added successfully" });
    } catch (error) {
      console.error("Error adding product:", error);
      return respond(500, { message: "Error adding product" });
    }
  }
  if (method === "PUT") {
    const worker_response = await createWorker({ task: WorkerTasks.ZohoProductUpdate })
    return respond(worker_response.StatusCode ?? 200, 'accepted' )
  }
  return;
};
