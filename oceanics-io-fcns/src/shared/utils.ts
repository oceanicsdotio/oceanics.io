/**
 * Cloud function version of API
 */
import neo4j from "neo4j-driver";
import { Endpoint, S3 } from "aws-sdk";
import crypto from "crypto";
// import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";

/**
 * Securely store and anc compare passwords
 */
export const hashPassword = (password: string, secret: string) =>
 crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

export const uuid4 = () => crypto.randomUUID().replace(/-/g, "");

export const connect = async (query: string) => {

    
    const driver = neo4j.driver(process.env.NEO4J_HOSTNAME??"", neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY??""));
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


/**
 * Make sure we don't leak anything...
 */
export function catchAll(wrapped: (args: any) => any) {
    return (args: any) => {
        try {
            return wrapped(args);
        } catch {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({message: "Server Error"})
            }
        }
    }
}