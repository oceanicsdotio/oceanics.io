import type { Handler } from "@netlify/functions";
import { Bucket, s3 } from "../shared/shared";

interface IQuery {
    service: string;
    key: string;
    ext: string;
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
        service="bivalve",
        key="index",
        ext="json",
    } = queryStringParameters as unknown as IQuery
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${service}/${key}.${ext}`
        }).promise();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: Body.toString('utf-8')
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}

export {handler}
