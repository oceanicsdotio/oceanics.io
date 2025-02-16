import { collection } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
// Cloud database routing and credentials
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
// Collection-based REST operations
export const handler: Handler = async function (event, context) {
    const result = await collection(
        url,
        access_key,
        event,
        context
    );
    return result
}
