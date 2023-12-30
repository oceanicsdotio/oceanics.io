import { Router } from "./shared/middleware";
import * as db from "./shared/queries";
import type { ApiHandler } from "./shared/middleware";
import apiSpec from "./shared/bathysphere.json";

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property. 
 */
 export const metadata: ApiHandler = async (context) => {
  const value = await db.metadata(context.user, context.left);
  return {
      statusCode: 200,
      data: {
          "@iot.count": value.length,
          value,
      }
  }
}

/**
 * Delete a pattern from the graph. Be careful, this can
 * remove all nodes matching the pattern. We usually restrict
 * to a pattern with an indexed/unique property when called
 * through the API to prevent unintentional data loss. 
 * 
 * The underlying query explicitly forbids dropping `Providers`
 * labels.
 */
const remove: ApiHandler = async (context) => {
  await db.remove(context.user, context.left);
  return {
    statusCode: 204
  }
}

export const handler = Router({
  GET: metadata,
  DELETE: remove
}, apiSpec.paths["/{entity}({uuid})"])