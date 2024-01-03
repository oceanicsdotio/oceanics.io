import * as db from "./shared/queries";
import { Router, paths } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property. 
 */
const GET: ApiHandler = async (context) => {
  const value = await db.readAndParse(context.metadata());
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
const DELETE: ApiHandler = async (context) => {
  await db.write(context.dropOneLinkedNode());
  return {
    statusCode: 204
  }
}

export const handler = Router({GET, DELETE}, paths["/{entity}({uuid})"])