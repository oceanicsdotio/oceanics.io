import type { Context } from "@netlify/functions";
import * as jose from "jose";
import { on_signup } from "@oceanics/functions";
// Routing and credentials from environment
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const signing_key = process.env.JWT_SIGNING_KEY ?? "";
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
export default async function (event: Request, _: Context) {
    if (event.method !== "POST") {
        return new Response("Method not supported", {
            status: 405
        })
    }
    const {host} = new URL(event.url);
    const secret = new TextEncoder().encode(signing_key);
    try {
        const { token } = await event.json();
        const { payload } = await jose.jwtVerify(token as string, secret, {
            issuer: host,
            audience: host,
        });
        if (typeof payload.sub === "undefined") throw Error("No Payload Sub");
        const obfuscated = Buffer.from(payload.sub).toString('base64');
        await on_signup(url, access_key, obfuscated);
        const body = JSON.stringify({ success: true })
        return new Response(body, {
            status: 200,
            headers
        })  
    } catch (error) {
        return new Response(JSON.stringify({ success: false }), {
            status: 401,
            headers
        })
    }
}
