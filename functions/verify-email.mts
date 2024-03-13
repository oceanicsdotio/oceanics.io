import type { Context } from "@netlify/functions";
import * as jose from "jose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Persist to Object Storage
const client = new S3Client({
    endpoint: "https://nyc3.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY ?? "",
        secretAccessKey: process.env.SPACES_SECRET_KEY ?? ""
    }
});

// Reused for error and success responses
const headers = {
    'Content-Type': 'application/json; charset=utf-8'
};

/**
 * Try to decode the JWT using the server key,
 * as well as the expected issuer/audience (server
 * host).
 * 
 * Get the sub from the token on success, 
 * and write it as a base64 string to cloud
 * object storage.
 */
export default async (req: Request, _: Context) => {
    if (req.method !== "POST") {
        return new Response("Method not supported", {
            status: 405
        })
    };

    const {host} = new URL(req.url);
    const secret = new TextEncoder().encode(process.env.JWT_SIGNING_KEY);
    try {
        const { token } = await req.json();
        const { payload } = await jose.jwtVerify(token as string, secret, {
            issuer: host,
            audience: host,
        });
        if (typeof payload.sub === "undefined") throw Error("No Payload Sub");
        const command = new PutObjectCommand({
            Bucket: "out-of-the-blue-today",
            Key: Buffer.from(payload.sub).toString('base64'),
            Body: "verified",
            ContentType: "text/plain"
        });

        const response = await client.send(command);
        const status = response["$metadata"].httpStatusCode;
        const success = status === 200;
        return new Response(JSON.stringify({ success }), {
            status,
            headers
        })  
    } catch (error) {
        console.error(error.message)
        return new Response(JSON.stringify({ success: false }), {
            status: 401,
            headers
        })
    }
}
