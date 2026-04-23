import { APIGatewayProxyResult } from "aws-lambda";
import type Stripe from "stripe";

export const respond = (statusCode: number, body?: any, headers?: Record<string, string>): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*', // change this to your frontend domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
});

export type HTTPMethods = 'GET' | 'OPTION' | 'POST' | 'PUT';


export function mapStripeToBigin(stripeCustomer: Stripe.Customer): Partial<BiginContact> {
  // Split name into First and Last for Bigin
  const fullName = stripeCustomer.name || '';
  const nameParts = fullName.trim().split(/\s+/);
  
  // Bigin requires Last_Name. If Stripe name is empty, fallback to email prefix.
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
  const lastName = nameParts.length > 0 
    ? nameParts[nameParts.length - 1] 
    : (stripeCustomer.email?.split('@')[0] || 'Unknown');

  return {
    First_Name: firstName || undefined,
    Last_Name: lastName, // Mandatory field in Bigin
    Email: stripeCustomer.email || undefined,
    Phone: stripeCustomer.phone || undefined,
    Description: stripeCustomer.description || undefined,
    
    // Flatten Stripe address to Bigin mailing fields
    Mailing_Street: stripeCustomer.address?.line1 || undefined,
    Mailing_City: stripeCustomer.address?.city || undefined,
    Mailing_State: stripeCustomer.address?.state || undefined,
    Mailing_Zip: stripeCustomer.address?.postal_code || undefined,
    Mailing_Country: stripeCustomer.address?.country || 'USA',

    // Store the Stripe ID in a custom field if you have one created (recommended)
    // Stripe_Customer_ID: stripeCustomer.id 
  };
}

export interface BiginContact {
  id?: string; // Unique record ID
  Owner?: {
    name: string;
    id: string;
    email: string;
  };
  First_Name?: string;
  Last_Name: string; // Mandatory field
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Secondary_Email?: string;
  Title?: string;
  Department?: string;
  Description?: string;
  
  // Relationship Fields
  Account_Name?: { // Referred to as "Company" in Bigin UI
    name: string;
    id: string;
  } | null;
  
  // Standard Boolean/Checkbox Fields
  Email_Opt_Out?: boolean; // Default Bigin field
  
  // System Fields
  Created_Time?: string; // ISO 8601 format
  Modified_Time?: string;
  Tag?: { name: string; id: string }[]; // Record tags

  // Dynamic/Custom Fields
  [custom_field: string]: any; 
}
