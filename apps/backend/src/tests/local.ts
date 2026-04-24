import express, { Request, Response } from 'express';
import { handler } from '../index.js';
import { 
  APIGatewayProxyEventV2WithRequestContext, 
  APIGatewayEventRequestContextV2 
} from 'aws-lambda';
import dotenv from 'dotenv';


dotenv.config()

const app = express();
app.use(express.json());

app.all(/.*/, async (req: Request, res: Response) => {
  // Construct the V2 Event structure
  const event: Partial<APIGatewayProxyEventV2WithRequestContext<APIGatewayEventRequestContextV2>> = {
    version: "2.0",
    routeKey: "$default",
    rawPath: req.path,
    rawQueryString: new URLSearchParams(req.query as any).toString(),
    headers: req.headers as Record<string, string>,
    queryStringParameters: req.query as Record<string, string>,
    body: JSON.stringify(req.body),
    isBase64Encoded: false,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
        protocol: "HTTP/1.1",
        sourceIp: req.ip ?? "127.0.0.1",
        userAgent: req.get('user-agent') ?? "postman",
      },
      // Mocked context fields
      accountId: "123456789012",
      apiId: "local-api",
      domainName: "localhost",
      domainPrefix: "localhost",
      requestId: `req-${Date.now()}`,
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    } as APIGatewayEventRequestContextV2,
  };

  try {
    // Cast to the full type for the handler
    const result = await handler(
      event as APIGatewayProxyEventV2WithRequestContext<APIGatewayEventRequestContextV2>, 
      {} as any,
      console.log
    );

    // V2 handlers can return a string or an object with statusCode
    if (typeof result === 'string') {
      res.status(200).send(result);
    } else {
      res.status(result?.statusCode || 200)
         .set(result?.headers || {})
         .send(result?.body);
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('🚀 API Gateway V2 Bridge running at http://localhost:3000'));
