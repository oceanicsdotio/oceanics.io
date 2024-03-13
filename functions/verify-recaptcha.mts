import type { Context } from "@netlify/functions";
import fetch from "node-fetch";

export default async (req: Request, _: Context) => {
    if (req.method !== "POST") {
        return {
            statusCode: 405,
            body: "Method not supported"
        }
    }
    const { response } = await req.json();
    const result = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.SITE_RECAPTCHA_SECRET}&response=${response}`, { method: "POST" }
    );
    const data = await result.json();
    return new Response(JSON.stringify(data), { status: result.status })
};
