import type { Stripe } from 'stripe';

export {}

declare module '/opt/nodejs/index' {

  export interface CartResponse {
    success: boolean;
    paymentIntent: Stripe.PaymentIntent;
  }
  export function getStripeClient(key: string): Stripe;
}