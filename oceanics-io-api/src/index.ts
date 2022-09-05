import apiSpec from "./shared/bathysphere.json";
import { NetlifyRouter } from "./shared/middleware";
import * as db from "./shared/queries";
import type { ApiHandler } from "./shared/middleware";

/**
 * Get an array of all collections by Node type
 */
const index: ApiHandler = async () => {
  return {
    statusCode: 200,
    data: await db.index()
  };
}

export const handler = NetlifyRouter({
  GET: index
}, apiSpec.paths["/"])
