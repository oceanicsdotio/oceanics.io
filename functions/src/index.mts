import { paths } from "../../specification.json";
import { index } from "@oceanics/functions";
import { Context } from "@netlify/functions";
import { Node as Logtail } from "@logtail/js";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const specification = paths["/"];
const log = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN ?? "");
export const handler = async function (event: Request, context: Context) {
    const start = performance.now();
    const name = `${event.method} index`;
    try {
        const result = await index(
            url,
            access_key,
            specification,
            event,
            context
        );
        const duration = performance.now() - start;
        log.info(name, {
            duration,
            event,
            context
        })
        return result
    } catch (error) {
        const duration = performance.now() - start;
        log.error(name, {
            duration,
            event,
            context
        });
        const body = JSON.stringify({
            message: error.message,
        })
        return new Response(body, {
            status: 500,
            headers: {
                "content_type": "application/json"
            }
        })
    }
};
