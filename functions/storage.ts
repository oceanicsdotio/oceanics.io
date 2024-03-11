import { Endpoint, S3 } from "aws-sdk";


const spacesEndpoint = new Endpoint(process.env.STORAGE_ENDPOINT??"");
export const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const metadata: ApiHandler = async ({
    query: {
        key
    }
}) => {
    // Check for existing fragment
    let meta;
    try {
        meta = await s3.headObject({
            Bucket: process.env.BUCKET_NAME,
            Key: key
        }).promise();
    } catch ({code}) {
        if (code === "NotFound") {
            return {
                statusCode: 404,
                body: "Not Found"
            }
        }
    }
    return {
        statusCode: 200,
        headers: {
            ...meta
        }
    }
}

/**
 * Create a new object in the S3 service
 */
const create: ApiHandler = async (context) => {
    try {
        await s3.putObject({
            Body: Buffer.from(context.request.body),
            Bucket: process.env.BUCKET_NAME,
            Key: context.request.uuid,
            ContentType: 'application/octet-stream',
            ACL:'public-read',
        }).promise();
    } catch ({code}) {
        return {
            statusCode: 500
        }
    }
    return {
        statusCode: 204
    }
}

/**
 * Browse saved results for a single model configuration.
 */
const retrieve: ApiHandler = async (context) => {
    let Body: S3.Body;
    try {    
        ({Body} = await s3.getObject({
            Bucket: process.env.BUCKET_NAME,
            Key: context.query.key
        }).promise()); 
    } catch ({message, statusCode}) {
        return { 
            statusCode: statusCode ?? 500, 
            body: message
        }
    }
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: Body?.toString('utf-8')??""
    };
}

export const handler = Router({
    GET: retrieve,
    HEAD: metadata,
    POST: create
}, apiSpec.paths["/storage"]);