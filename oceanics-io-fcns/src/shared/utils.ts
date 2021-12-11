/**
 * Cloud function version of API
 */
import neo4j from "neo4j-driver";
import { Endpoint, S3 } from "aws-sdk";
// import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";


export const connect = async (query) => {
    const driver = neo4j.driver(process.env.NEO4J_HOSTNAME, neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY));
    const session = driver.session({defaultAccessMode: neo4j.session.READ});
    const result = await session.run(query);
    await driver.close();
    return result;
 }


 
const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
export const Bucket = "oceanicsdotio";
export const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const authenticate = (event, context, target) => {
    const db = null; // graph
    const [username, password] = (event.headers["authorization"]??":").split(":")
    if (username && username.includes("@") && username.includes(".")) {  // basic auth
        try {
//                 user = next(load_node(User(name=username), db))
//                 assert custom_app_context.verify(password, user.credential)
        } catch {
            return [{"message": "Invalid username or password"}, 403]
        }
    } else { // bearer token
        const secretKey = event.headers["x-api-key"]??"salt";
        try {
//                 decoded = TimedJSONWebSignatureSerializer(secretKey).loads(password)
//                 uuid = decoded["uuid"]
//                 user = next(load_node(User(uuid=uuid), db))
        } catch {
//                 return {"Error": "Invalid authorization and/or x-api-key headers"}, 403
        }
    }

    const domain = username.split("@").pop();
//             const provider = next(load_node(Providers(domain=domain), db))

    return target(event, context, null)
}

