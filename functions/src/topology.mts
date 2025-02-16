import { topology } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
// Credentials
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
// Topological query handler, operates on relationships only
export const handler: Handler = async function(event, context){
    const result = await topology(
        url, 
        access_key,
        event,
        context
    );
    return result
}
