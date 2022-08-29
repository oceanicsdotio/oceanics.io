import { Endpoint, S3 } from "aws-sdk";

const spacesEndpoint = new Endpoint(process.env.STORAGE_ENDPOINT);
const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

enum Extension {
    JSON="json",
    CSV="csv"
}
interface IQuery {
    service: string;
    key: string;
    ext: Extension;
}

// Transform to pass into retrieve()
export const transformCsv = (text: string) => {
    const result = text.split("\n")
        .slice() // copy to prevent readable body disappearing
        .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
    return JSON.stringify(result)
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
export const retrieve = async ({
    queryStringParameters: {
        service,
        key,
        ext,
    },
    transform
}: {
    queryStringParameters: IQuery
    transform: (test: string) => string
}) => {
    let Body: S3.Body;
    try {    
        ({Body} = await s3.getObject({
            Bucket: process.env.BUCKET_NAME,
            Key: `${service}/${key}.${ext}`
        }).promise()); 
    } catch ({message, statusCode}) {
        return { 
            statusCode: statusCode ?? 500, 
            body: message
        }
    }
    let body = Body?.toString('utf-8')??"";
    if (typeof transform !== "undefined") {
        body = transform(body);
    }
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body
    };
}
