import { topology } from "@oceanics/functions";
import { paths } from "../../specification.json";
import type { Handler } from "@netlify/functions";

const url = process.env.NEO4J_HOSTNAME ?? "";
const access_key = process.env.NEO4J_ACCESS_KEY ?? "";
const specification = paths["/{root}({rootId})/{entity}({uuid})"];
export const handler: Handler = topology.bind(
    undefined, 
    url, 
    access_key, 
    specification
);
