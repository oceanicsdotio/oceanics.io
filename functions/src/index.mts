import { index } from "@oceanics/functions";
import { Handler } from "@netlify/functions";
// Routing and credentials from environment
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
// Index and node counting handler
export const handler: Handler = async function (event, context) {
    const response = await index(
        url,
        access_key,
        event,
        context
    );
    return response;
};
