 import { APIGatewayProxyEventV2 } from "aws-lambda"
 import { Context } from "vm"
 import { type HTTPMethods, respond } from "./utils"
import { getAccessToken } from './utils';
 export const contactHandler = async ( 
     req: APIGatewayProxyEventV2,
     _: Context,
     method: HTTPMethods) =>{
 
 if(method === 'POST'){
    if (!req.body) {
      return respond(400, { message: 'Missing request body' });
    }
    const {Last_Name, Email} = JSON.parse(req.body);
    if(!Last_Name){
      return respond(400, { message: 'Last_Name is required' });
    }
    // waiting on zoho api docs to implement contact creation, will add code here to create a contact in zoho crm when this endpoint is hit 
   try{
    const result = await fetch('https://www.zohoapis.com/bigin/v2/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [req.body] })
    });
    return respond(201, { message: 'Contact creation triggered' });
  }catch(error: any){
    console.error('Error creating contact in Zoho:', error);
    return respond(500, { message: error.message || 'Error creating contact in Zoho' });
  }
    
  }
  return;
}