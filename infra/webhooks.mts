import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.STRIPE_SECRET_KEY
const lambdaUrl = process.env.VITE_API_URL;

enum StripeEvents {
   new_customer = 'customer.created',
   checkout_complete = 'checkout.session.completed',
   invoice_paid = 'invoice_payment.paid'

}

const enabled_events = Object.values(StripeEvents)

if(!apiKey)
    throw new Error('API key not found');

if(!lambdaUrl)
    throw new Error('Lambda URL not set')


// Load your Stripe secret key from environment variables
const stripe = new Stripe(apiKey);
const url = `${lambdaUrl.replace(/\/$/, '')}/stripe-webhook`
async function createWebhookEndpoint() {
    // Create the webhook endpoint
    return stripe.webhookEndpoints.create({
      url, // Your webhook listener URL
      enabled_events,
      description: 'Webhook for payment and customer events',
    }).then((webhook)=>{
         console.log('✅ Webhook endpoint created successfully:');
         console.log(webhook);
         return webhook;
    })

   


}

async function checkForWebhook(): Promise<boolean>{
    const webhookes = await stripe.webhookEndpoints.list({ limit: 100 })
    try{
        const matchingWebhook = webhookes.data.find((hook)=>hook.url === url)
        console.log('no matching webhooks found')
        return !matchingWebhook
    }
    catch(e) {
        console.log('failed to check for existing webhooks',(e as  Stripe.ErrorType.StripeInvalidRequestError).message)
        throw e;
    }
   
}

const shouldCreateWebHook = await checkForWebhook()
if(shouldCreateWebHook)
    createWebhookEndpoint();


