import { paths } from "../../specification.json";
import { collection } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const specification = paths["/{entity}"];
export const handler: Handler = (event, context) => {
    return collection.bind(
        undefined,
        url,
        access_key,
        specification
    )(event, context);
}
