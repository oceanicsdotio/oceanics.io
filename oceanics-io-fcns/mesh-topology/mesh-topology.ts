import type {Handler} from "@netlify/functions"
import { Endpoint, S3 } from 'aws-sdk';

const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

interface IQuery {
    Service: string;
    Key: string;
    Ext: string;
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
const handler: Handler = async ({
    queryStringParameters
}) => {

    const {
        Service="MidcoastMaineMesh",
        Key="midcoast_elements",
        Ext="csv",
    } = queryStringParameters as unknown as IQuery
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();

        const CSV = Body
            .toString('utf-8')
            .split("\n")
            .slice() // copy to prevent readable body disappearing
            .map(line => line.split(",").map(x => x.trim()).slice(1, 4));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CSV)
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}


export {handler}