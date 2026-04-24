import { APIGatewayProxyEventV2, Context } from "aws-lambda";
const { getStripeClient } = await import(process.env.LOCAL ? './tests/mockedLayer' : "/opt/nodejs/index.js")
import type { CartDetails, CartEntry } from "use-shopping-cart/core";
import { respond } from "./utils";
import Stripe from "stripe";

interface sessionRequestBody {
    cartDetails: CartDetails;
}
const isSessionRequestBody = (body: any): body is sessionRequestBody => {
    return body && typeof body === 'object' && 'cartDetails' in body;
}

type LineItems = Stripe.Checkout.SessionCreateParams['line_items']

export const handler = async (
  req: APIGatewayProxyEventV2,
  context: Context,
) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if(typeof stripeKey !== 'string' || stripeKey.length === 0 ){
        console.warn('stripe key is missing')
        return respond(500, new Error('stripe key is missing'))
    }
    const stripe = getStripeClient(process.env. STRIPE_SECRET_KEY!);
    const { method, path } = req.requestContext.http;
    // if the request is not for stripe, just return, allow rest of handlers
    if(method === 'POST'){
        if (!req.body) {
            return respond(400, { message: 'Missing request body' });
        }
        // check if body is tpye sessionRequestBody
        const body: sessionRequestBody = JSON.parse(req.body);

        if (!isSessionRequestBody(body)) {
            return respond(400, { message: 'Invalid request body' });
        }

        const { cartDetails } = body
        const line_items: LineItems = Object.values<CartEntry>(cartDetails).map((item) => ({

            price_data: {
                currency: 'usd',
                product_data: {
                name: item.name,
                images: item.image ? [item.image] : []
                },
                unit_amount: item.price
            },
            metadata: (item.product_data as any),
            quantity: item.quantity
            }))

        const session = await (stripe as Stripe).checkout.sessions.create({
        mode: 'payment',
        line_items,
        customer_creation: 'always',
        success_url: `${req.headers.origin}/success`,
        cancel_url: req.headers.origin
        });

        return respond(200, { sessionUrl: session.url, id: session.id });
    }
    return;
}