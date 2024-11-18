import { collection } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
import { Node } from "@logtail/js";
// Cloud database routing and credentials
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const logger_token = process.env.LOGTAIL_SOURCE_TOKEN ?? "";
// Collection-based REST operations
export const handler: Handler = async function (event, context) {
    const start = performance.now();
    const log = new Node(logger_token);
    const result = collection(
        url,
        access_key,
        event,
        context
    );
    const duration = performance.now() - start;
    log.info(`${event.httpMethod} collection`, {
        event, 
        context,
        duration
    })
    return result
}
