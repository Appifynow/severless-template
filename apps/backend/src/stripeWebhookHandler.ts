import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { BiginContact, HTTPMethods, mapStripeToBigin, respond } from "./utils";
import zoho, { ZOHODeal } from "./zoho.js";
import crypto from 'crypto';
import type Stripe from 'stripe'


enum StripeEvents {
   new_customer = 'customer.created',
   checkout_complete = 'checkout.session.completed',
   invoice_paid = 'invoice_payment.paid'

}


 export const stripeWebhookHandler = async ( 
    
     req: APIGatewayProxyEventV2,
     _: Context,
     method: HTTPMethods) =>{
        let body;
        try{
            body = JSON.parse(req.body!);
        }
        catch(e){
            return respond(400, {message: 'failed to parse JSON'})
        }
        if(!body){
            return respond(400, {message: 'no event in body'})
        }
        if(method === 'POST'){
            const event: StripeWebhookEvent = body // wrong

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
                const customer = checkout.customer as Stripe.Customer
                const products = checkout.line_items?.data.map(({quantity, object, price, id })=>({quantity, object, price, id }))
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
                    Sub_Pipeline: '7374418000000607001', // these can be found in url on zoho page
                    Stage: 'Order Received',
                    Amount: checkout.amount_total ?? 0,
                    Contact_Name: { id: newCustomer.details.id },
                    Associated_Products: products?.map(({quantity, object: name, price: List_Price, id })=>{
                        return {
                            Product: {
                                name,
                                id,
                            },
                            Quantity: quantity ?? 0,
                            Discount: 0, // hard coded for now,
                            List_Price: (List_Price?.unit_amount ?? 1) /100 
                        }
                    })
                };

                return zoho.createDeal(order)
                .then(_=> respond(200))
                .catch(resp => respond(500, resp.message))
                

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