/**
 * Cloud function version of API
 */
 import {connect} from "../shared/shared";
import type { QueryResult } from "neo4j-driver";
 import type {Handler} from "@netlify/functions";
 import jwt from "jsonwebtoken";

 const HTTP_METHODS = ["GET"];

 interface IRegister {
     email: string;
     password: string;
     secret: string;
     apiKey: string;
 }
 /**
  * Create a new account using email address
  */
 const register = async ({email, password}: IRegister): Promise<any[]> => {
    const result = await connect(`MERGE ( n:User { email: '${email}', credential: '${password}' }) RETURN n`);
    return result.records.map((record) => {
        //@ts-ignore
        const {_fields: [{labels, properties}]} = record;
        return {
            labels,
            properties
        }
    })
 };

 interface IToken {
     userId: string;
     secret?: string;
 }

 /**
  * Exchange user name and password for JWT
  */
 const token = ({userId, secret="salt"}: IToken) => {
    return jwt.sign({
        "uuid": userId
    }, secret, {expiresIn: 3600})
 };

 interface IManage {
     email?: string;
     password?: string;
     secret?: string;
 }
 /**
  * Update account information
  */
 const manage = ({}: IManage): Promise<QueryResult> => {

//     current, mutation = parse_as_nodes((user, User(**body)))

//     # Execute the query
//     with db.session() as session:
//         return session.write_transaction(current.mutate(mutation).query)


 };


 /**
  * Browse saved results for a single model configuration. 
  * Results from different configurations are probably not
  * directly comparable, so we reduce the chances that someone 
  * makes wild conclusions comparing numerically
  * different models.
 
  * You can only access results for that test, although multiple collections * may be stored in a single place 
  */
 const handler: Handler = async ({headers, body, httpMethod}) => {
    
    if (!HTTP_METHODS.includes(httpMethod)) {
        return { 
            statusCode: 405, 
            body: JSON.stringify({message: `Valid HTTP methods are ${HTTP_METHODS}`})
        };
    }
     let response;
     let statusCode = 200;
     let data;

     let {email, apiKey} = JSON.parse(body??"{}");
     apiKey = apiKey ?? headers["x-api-key"] ?? "";
    // if (!apiKey) {
    //     const message = (
    //         "Registration requires a valid value supplied as the `x-api-key`"+
    //         "or `apiKey` in the request body. This is used to associate your "+
    //         "account with a public or private ingress."
    //     );
    //     return { 
    //         statusCode: 403, 
    //         body: JSON.stringify({message})
    //     };
    // }

    // if (!("@" in username && "." in username)) {
    //     return { 
    //         statusCode: 403, 
    //         body: JSON.stringify({message: "Use email address"})
    //     };
    // }

    // try:
    //     provider = next(load_node(Providers(api_key=apiKey, domain=domain), db))
    // except StopIteration:
    //     return {"message": "Bad API key."}, 403

    // user = User(
    //     name=username,
    //     uuid=uuid4().hex,
    //     credential=custom_app_context.hash(body.get("password")),
    //     ip=request.remote_addr,
    // )

    // user_node, provider_node = parse_as_nodes((user, provider))

    // # establish provenance
    // link_cypher = Links(label="Register", rank=0).join(user_node, provider_node)

    try {
        data = await register({email, password});
     } catch (error) {
         return { 
            statusCode: 500, 
            body: JSON.stringify({message: "No graph backend", error})
        };
     }

    // return {"message": f"Registered as a member of {provider.name}."}, 200

     return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
     }
 }
 
 
 export {handler}