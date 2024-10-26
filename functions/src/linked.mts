import { paths } from "../../specification.json";
import { linked } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
import { Node } from "@logtail/js";
// Credentials and routing
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const logtail_source_token = process.env.LOGTAIL_SOURCE_TOKEN ?? "";
// OpenAPI description
const specification = paths["/{root}({rootId})/{entity}"];
// Reusable logging interface
let log: Node | null = null;
export const handler: Handler = async function (event, context) {
    const start = performance.now();
    if (!log) log = new Node(logtail_source_token);
    const result = await linked(
        url,
        access_key,
        specification,
        event,
        context
    );
    const duration = performance.now() - start;
    log.info(`${event.httpMethod} linked`, {
        event, 
        context,
        duration
    })
    return result
}
