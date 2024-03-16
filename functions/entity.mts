import { paths } from "../specification.json";
import { entity } from "@oceanics/functions";
import type { Handler } from "@netlify/functions";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const specification = paths["/{entity}({uuid})"];
export const handler: Handler = entity.bind(
    undefined, 
    url, 
    access_key, 
    specification
);
