import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { getStripeClient } from "/opt/nodejs/index";
import type { CartDetails } from "use-shopping-cart/core";
import { respond } from "./utils";

interface sessionRequestBody {
    cartDetails: CartDetails;
}
const isSessionRequestBody = (body: any): body is sessionRequestBody => {
    return body && typeof body === 'object' && 'cartDetails' in body;
}

export const handler = async (
  req: APIGatewayProxyEventV2,
  context: Context,
) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if(typeof stripeKey !== 'string' || stripeKey.length === 0 ){
        console.warn('stripe key is missing')
        return;
    }
    const stripe = getStripeClient(process.env. STRIPE_SECRET_KEY!);
    const { method, path } = req.requestContext.http;
    // if the request is not for stripe, just return, allow rest of handlers
    if(path === '/checkout' && method === 'POST'){
        if (!req.body) {
            return respond(400, { message: 'Missing request body' });
        }
        // check if body is tpye sessionRequestBody
        const body: sessionRequestBody = JSON.parse(req.body);

        if (!isSessionRequestBody(body)) {
            return respond(400, { message: 'Invalid request body' });
        }

        const { cartDetails } = body
        const line_items = Object.values<CartDetails>(cartDetails).map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                name: item.name,
                images: [item.image]
                },
                unit_amount: item.price
            },
            quantity: item.quantity
            }))

        const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        success_url: `${req.headers.origin}/success`,
        cancel_url: req.headers.origin
        });

        return respond(200, { sessionUrl: session.url });
    }
    return;
}