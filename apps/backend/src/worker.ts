import { mapStripeToBigin, respond, WorkerPayload, WorkerTasks } from "./utils";
import { SyncProducts } from "./workerFn/productSync";
import zoho, { ZOHODeal } from "./zoho.js";
import crypto from "crypto";
import Stripe from "stripe";

enum StripeEvents {
  new_customer = "customer.created",
  checkout_complete = "checkout.session.completed",
  invoice_paid = "invoice_payment.paid",
}

export const handler = async (payload: WorkerPayload) => {
  if (!payload) {
    throw new Error("no event in body");
  }

  console.log("webhook processing", payload.task);
  switch (payload.task) {
    case WorkerTasks.StripeWebhook: {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (typeof stripeKey !== "string" || stripeKey.length === 0) {
        console.warn("stripe key is missing");
        return respond(500, new Error("stripe key is missing"));
      }
      const stripe = new Stripe(stripeKey);
      const event: StripeWebhookEvent = JSON.parse(payload.event ?? '{}') // todo error checking 
      if(!event)
        throw new Error('Recieved no event in payload')
      switch (event.type) {
        case StripeEvents.new_customer: {
          const customer = event.data.object as Stripe.Customer;
          const contact = mapStripeToBigin(customer);
          const newContact = await zoho.createNewContact(contact);
          return newContact;
        }
        case StripeEvents.checkout_complete: {
          console.log("Being Checkout EVENT");
          // create a new deal
          const checkout = event.data.object as Stripe.Checkout.Session;
          const customerId = checkout.customer as string | null;
          if (!customerId) {
            throw new Error("customer not found in event data");
          }
          console.log("retrieving stripe customer");
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted) {
            return `customer was deleted on ${customer.lastResponse}`;
          }
          console.log("processing items");
          const line_items = await stripe.checkout.sessions.listLineItems(
            checkout.id
          );
          const products = line_items.data.map(
            ({ quantity, description, price, metadata }) => {
              const id = metadata?.["zoho_product_id"] ?? "";
              return { quantity, name: description, price, id };
            }
          );
          console.log("processed", products.length, "items");
          // may need to just find customer enstead of creating
          const contact = mapStripeToBigin(customer);
          const newCustomer = await zoho.createNewContact(contact);
          console.log("Upsert zoho contact", newCustomer?.details?.id);
          const orderNumber = crypto.randomUUID();
          await stripe.checkout.sessions.update(checkout.id, {
            metadata: { orderNumber },
          });
          console.log("adding order number to stripe");
          const order: ZOHODeal = {
            Deal_Name: `Order# ${orderNumber}`,
            Pipeline: {
              id: "7374418000000091023",
              name: "Order Fullfillment",
            },
            Closing_Date: new Date().toISOString().split("T")[0],
            Sub_Pipeline: "7374418000000607001", // these can be found in url on zoho page
            Stage: "Order Received",
            Amount: (checkout.amount_total ?? 1) / 100,
            Contact_Name: { id: newCustomer.details.id },
            Associated_Products: products?.map(
              ({ quantity, name, price: List_Price, id }) => {
                return {
                  Product: {
                    name: name ?? "Unknown Product",
                    id,
                  },
                  Quantity: quantity ?? 0,
                  Discount: 0, // hard coded for now,
                  List_Price: (List_Price?.unit_amount ?? 1) / 100,
                };
              }
            ),
          };
          console.log("deal", JSON.stringify(order));

          await zoho.createDeal(order);
          console.log("Order Created, End Processing");
        }
        case StripeEvents.invoice_paid: {
          //not handling this event
          return "invoice paid skipped";
        }
        default: {
          return "no event type handled";
        }
      }
    }
    case WorkerTasks.ZohoProductUpdate: {
        await SyncProducts();
        return;
    }
    default: {
        console.log(`${payload} had no handler`);
        return;
    }
  }
};

export type StripeWebhookEvent = {
  id: string;
  object: "event";
  api_version: string;
  created: number;
  data: {
    object: unknown;
    previous_attributes?: string[];
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeEvents;
};
