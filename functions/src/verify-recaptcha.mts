import type { Context } from "@netlify/functions";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, _: Context) => {
    if (req.method !== "POST") {
        return {
            statusCode: 405,
            body: "Method not supported"
        }
    }
    const { response } = await req.json();
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.SITE_RECAPTCHA_SECRET}&response=${response}`
    const result = await fetch(url, { method: "POST" });
    const data = await result.json();
    return new Response(JSON.stringify(data), { status: result.status })
};
