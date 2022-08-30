import { s3, NetlifyRouter } from "./shared/middleware";
import type { S3 } from "aws-sdk";
import type { ApiHandler } from "./shared/middleware";
import apiSpec from "./shared/bathysphere.json";


const metadata: ApiHandler = async ({
    queryStringParameters: {
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
const create: ApiHandler = async ({
    queryStringParameters: {
        key
    },
    body
}) => {
    try {
        await s3.putObject({
            Body: Buffer.from(body),
            Bucket: process.env.BUCKET_NAME,
            Key: key,
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
const retrieve: ApiHandler = async ({
    queryStringParameters: {
        key
    }
}) => {
    let Body: S3.Body;
    try {    
        ({Body} = await s3.getObject({
            Bucket: process.env.BUCKET_NAME,
            Key: key
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

export const handler = NetlifyRouter({
    GET: retrieve,
    HEAD: metadata,
    POST: create
}, apiSpec.paths["/storage"]);