import { on_signup } from "@oceanics/functions";
import { Context } from "@netlify/functions";
import { Node } from "@logtail/js";
// Routing and credentials from environment
const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const logtail_source_token = process.env.LOGTAIL_SOURCE_TOKEN ?? "";
// Reusable logging interface
let log: Node | null = null;
// Index and node counting handler
export default async function (event: Request, context: Context) {
    const start = performance.now();
    if (!log) log = new Node(logtail_source_token);
    const { user } = await event.json();
    if (typeof user === "undefined") {
        const duration = performance.now() - start;
        log.error(`identity-signup-background`, {
            duration,
            event,
            context
        })
        return;
    }
    await on_signup(url, access_key, user.email);
    const duration = performance.now() - start;
    log.info(`identity-signup-background`, {
        duration,
        event,
        context
    })
};
