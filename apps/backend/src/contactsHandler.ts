 import { APIGatewayProxyEventV2 } from "aws-lambda"
 import { Context } from "vm"
 import { type HTTPMethods, respond } from "./utils"
import { createNewContact, getAccessToken } from './zoho';




 export const contactHandler = async ( 
     req: APIGatewayProxyEventV2,
     _: Context,
     method: HTTPMethods) =>{
 
 if(method === 'POST'){
    if (!req.body) {
      return respond(400, { message: 'Missing request body' });
    }
    const contact = JSON.parse(req.body);
    if(!contact.Last_Name){
      return respond(400, { message: 'Last_Name is required' });
    }
    // waiting on zoho api docs to implement contact creation, will add code here to create a contact in zoho crm when this endpoint is hit 
   return await createNewContact(contact)
   .then(()=>respond(200, {message: 'Zoho contact Created'}))
   .catch(e=>respond(500, {message: 'Failed to create contact'}))
    
  }
  return;
}

