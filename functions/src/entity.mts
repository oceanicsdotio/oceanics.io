import { entity } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
export const handler: Handler = async function (event, context) {
    const result = await entity(
        url,
        access_key,
        event,
        context
    );
    return result
}
