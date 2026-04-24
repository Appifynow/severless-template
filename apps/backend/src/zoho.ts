import { BiginContact } from "./utils";

export const getAccessToken = async () => {
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN!;
  const clientId = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;
  const tokenUrl = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
    const response: { access_token: string } = await fetch(tokenUrl, {
      method: 'POST',
    }).then(res => res.ok ? res : Promise.reject(res))
    .then(res => res.json() as Promise<{ access_token: string }>);
    
    return response.access_token;

}

export const createNewContact = async (contact: Partial<BiginContact>, token?: string): Promise<ZOHORecordCreateResponse['data'][0]> => {
  return fetch('https://www.zohoapis.com/bigin/v2/Contacts/upsert', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token ?? await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [contact], duplicate_check_fields: ['Last_Name', 'First_Name', 'Email'] })
    }).then(res=>res.json() as Promise<ZOHORecordCreateResponse>).then(contacts=>contacts.data[0]) // this function only creates one
}

export const createDeal = async (deal: ZOHODeal, token?: string) => {
    return fetch('https://www.zohoapis.com/bigin/v2/Pipelines', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token ?? await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [deal] })
    });
}

export default { createDeal, getAccessToken, createNewContact }

export interface ZOHODeal  {
            Owner?: {
                id?: string;
            },
            Deal_Name: string
            Account_Name?: {
                id?: string
            },
            Contact_Name?: {
                id?: string
            },
            Sub_Pipeline: string,
            Stage?: string,
            Amount?: number,
            Secondary_Contacts?: {id:string}[],
            Closing_Date?: string,
            "Tag"?: {name: string}[],
            "Description"?: string,
            "Pipeline": {
                "name": string,
                "id": string
            },
            "Associated_Products"?: { Quantity: number; List_Price: number, Discount: number; Product: {name: string; id: string }}[]
        }
export interface ZohoTag { name : string }
export interface ZOHOProduct {
			"Owner": {
				"id": string
			},
			"Product_Name": string,
			"Product_Code": string,
			"Unit_Price": number,
			"Product_Category": string,
			"Description": string,
			"Tag": ZohoTag[]
			"Product_Active": boolean
		}
interface ZOHORecordCreateResponse {
    "data": 
        {
            "code": string
            "details": {
                "Modified_Time": string,
                "Modified_By": {
                    "name":string,
                    "id": string
                },
                "Created_Time": string,
                "id": string,
                "Created_By": {
                    "name": string,
                    "id": string
                },
                "$approval_state": 'string'
            },
            "message": string,
            "status": string
        }[]
      }