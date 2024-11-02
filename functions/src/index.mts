import { paths } from "../../specification.json";
import { index } from "@oceanics/functions";
import { Handler } from "@netlify/functions";
import { Node } from "@logtail/js";
// Routing and credentials from environment
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const logtail_source_token = process.env.LOGTAIL_SOURCE_TOKEN ?? "";
// OpenAPI route description
const specification = paths["/"];
// Reusable logging interface
let log: Node | null = null;
// Index and node counting handler
export const handler: Handler = async function (event, context) {
    const start = performance.now();
    if (!log) log = new Node(logtail_source_token);
    const response = await index(
        url,
        access_key,
        specification,
        event,
        context
    );
    const duration = performance.now() - start;
    log.info(`${event.httpMethod} index`, {
        duration,
        event,
        context
    })
    return response;
};
