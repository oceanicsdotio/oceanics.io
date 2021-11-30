/**
 * Cloud function version of API
 */
import neo4j from "neo4j-driver";
import { Endpoint, S3 } from "aws-sdk";


export const connect = async (query: string) => {
    const driver = neo4j.driver(process.env.NEO4J_HOSTNAME, neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY));
    const session = driver.session({defaultAccessMode: neo4j.session.READ});
    const result = await session.run(query);
    await driver.close();
    return result;
 }


export const register = () => {
    
}
 
const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
export const Bucket = "oceanicsdotio";
export const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

