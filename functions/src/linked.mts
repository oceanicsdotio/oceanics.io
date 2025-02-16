import { linked } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
// Credentials and routing
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
export const handler: Handler = async function (event, context) {
    const result = await linked(
        url,
        access_key,
        event,
        context
    );
    return result
}
