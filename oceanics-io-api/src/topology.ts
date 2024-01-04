
import * as db from "./shared/queries";
import { Router, paths } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";

// Don't currently pass custom label through the API (but should)
const DEFAULT_LABEL = "Link"

/**
 * Connect two nodes.
 */
const POST: ApiHandler = async (context) => {
  await db.write(context.joinNodesQuery(DEFAULT_LABEL));
  return {
    statusCode: 204
  }
}

/**
 * Drop connection between two nodes. 
 */
const DELETE: ApiHandler = async (context) => {
  await db.write(context.dropLinkQuery(DEFAULT_LABEL));
  return {
    statusCode: 204
  }
}

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.
 
 * You can only access results for that test, although multiple collections 
 * may be stored in a single place 
 */
export const handler = Router({POST, DELETE}, paths["/{root}({rootId})/{entity}"]);
