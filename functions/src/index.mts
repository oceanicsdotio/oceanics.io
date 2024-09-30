import { paths } from "../../specification.json";
import { index } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";
import { Node as Logtail} from "@logtail/js";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const specification = paths["/"];
const curried = index.bind(
    undefined,
    url,
    access_key,
    specification
);
const log = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");
export const handler: Handler = async function (event, context) {
    const start = performance.now();
    const name = `${event.httpMethod} index`;
    const metadata = {
        event, 
        context
    }
    try {
        const result = await curried(event, context);
        const duration = performance.now() - start;
        log.info(name, {duration, ...metadata})
        return result
    } catch(error) {
        const duration = performance.now() - start;
        log.error(name, {duration,...metadata})
        return {
            statusCode: 500,
            headers: {
                "content_type": "application/json"
            },
            body: JSON.stringify({
                message: error.message,
            })
        }
    }
};
