import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import {  HTTPMethods, mapStripeToBigin, respond } from "./utils";
import zoho, { ZOHODeal } from "./zoho.js";
import crypto from 'crypto';
import type Stripe from 'stripe';
const { getStripeClient } = await import(process.env.LOCAL ? './tests/mockedLayer' : "/opt/nodejs/index.js")


enum StripeEvents {
   new_customer = 'customer.created',
   checkout_complete = 'checkout.session.completed',
   invoice_paid = 'invoice_payment.paid'

}


 export const stripeWebhookHandler = async ( 
    
     req: APIGatewayProxyEventV2,
     _: Context,
     method: HTTPMethods) =>{
        console.log('webhook processing')
        const stripeKey = process.env.STRIPE_SECRET_KEY
        if(typeof stripeKey !== 'string' || stripeKey.length === 0 ){
            console.warn('stripe key is missing')
            return respond(500, new Error('stripe key is missing'))
        }
        const stripe = getStripeClient(stripeKey);
        
        if(method === 'POST'){
            let body;
            if(!req.body){
                return respond(400, {message: 'no event in body'})
            }
            try{
                body = JSON.parse(req.body);
            }
            catch(e){
                return respond(400, {message: 'failed to parse JSON'})
            }
            const event: StripeWebhookEvent = body

            switch(event.type){
                case StripeEvents.new_customer: {
                    const customer = body.data.object as Stripe.Customer
                    const contact = mapStripeToBigin(customer);
                    return zoho.createNewContact(contact)
                    .then(()=>respond(200))
                    .catch(()=>respond(400, {message: 'failed to add a contact to ZOHO'}))
            }
            case StripeEvents.checkout_complete: {
                // create a new deal
                const checkout = event.data.object as Stripe.Checkout.Session
                const customerId = checkout.customer as string | null ;
                if(!customerId){
                    return respond(400, {message: 'customer not found in event data'})
                }
                const customer = await stripe.customers.retrieve(customerId);
                if(customer.deleted){
                    return respond(200, {message: `customer was deleted on ${customer.lastResponse}`})
                }
                const line_items = await (stripe as Stripe).checkout.sessions.listLineItems(checkout.id)
                const products = line_items.data.map(({quantity,description, price, metadata })=>{
                    const id = metadata?.['zoho_product_id'] ?? ''
                    return { quantity, name: description, price, id }
            })
                // may need to just find customer enstead of creating
                const contact = mapStripeToBigin(customer);
                const newCustomer = await zoho.createNewContact(contact)
                const orderNumber = crypto.randomUUID();
                const order: ZOHODeal = {
                    Deal_Name: `Order# ${orderNumber}`,
                    Pipeline: {
                        id: '7374418000000091023',
                        name: 'Order Fullfillment',
                    },
                    Closing_Date: new Date().toISOString().split('T')[0],
                    Sub_Pipeline: '7374418000000607001', // these can be found in url on zoho page
                    Stage: 'Order Received',
                    Amount: checkout.amount_total ?? 0,
                    Contact_Name: { id: newCustomer.details.id },
                    Associated_Products: products?.map(({quantity, name, price: List_Price, id })=>{
                        return {
                            Product: {
                                name: name ?? 'Unknown Product',
                                id,
                            },
                            Quantity: quantity ?? 0,
                            Discount: 0, // hard coded for now,
                            List_Price: (List_Price?.unit_amount ?? 1) /100 
                        }
                    })
                };
                console.log('deal', JSON.stringify(order))

                return zoho.createDeal(order)
                .then(async resp=> {
                    if(resp.ok){
                        return respond(200, { message: 'created new order'}) 
                    }
                    const error_message = await resp.text()
                    return respond(500, {service: 'ZOHO', error: error_message })
            })
                

            }
            case StripeEvents.invoice_paid: {
                //not handling this event
                return respond(200, {message: 'invoice paid skipped'});
            }
            default: {
                return respond(200, {message: 'no event type handled'});
            }
        }
    }
    return respond(404, 'web hooks only use POST')
}


export type StripeWebhookEvent = {
  id: string;
  object: "event";
  api_version: string;
  created: number;
  data: {
    object: unknown;
    previous_attributes?: string[],
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeEvents;
};