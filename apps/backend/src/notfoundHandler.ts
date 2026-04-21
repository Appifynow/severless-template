import { APIGatewayProxyEventV2 } from "aws-lambda"
import { Context } from "vm"
import { HTTPMethods, respond } from "./utils"

export const notfoundHandler = ( 
    req: APIGatewayProxyEventV2,
    _: Context,
    method: HTTPMethods) =>{
        return respond(400, `can not ${method} at ${req.requestContext.http.path}`)
    }