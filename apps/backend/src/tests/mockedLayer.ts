import Stripe from "stripe"

export const getStripeClient = (api: string)=>{
    return new Stripe(api)
}