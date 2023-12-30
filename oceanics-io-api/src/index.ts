import apiSpec from "./shared/bathysphere.json";
import { Router } from "./shared/middleware";
import * as db from "./shared/queries";
import type { ApiHandler } from "./shared/middleware";
import { Node } from "oceanics-io-api-wasm";

/**
 * Get an array of all collections by Node type
 */
const GET: ApiHandler = async () => {
  const { query } = Node.allLabels();
  return {
    statusCode: 200,
    data: await db.readAndParseLabels(query)
  };
}

export const handler = Router({
  GET
}, apiSpec.paths["/"])
