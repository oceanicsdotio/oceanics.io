import { Router } from "./shared/middleware";
import * as db from "./shared/queries";
import type { ApiHandler } from "./shared/middleware";
import apiSpec from "./shared/bathysphere.json";

// Don't currently pass custom label through the API (but should)
const DEFAULT_LABEL = "Link"

/**
 * Connect two nodes.
 */
const join: ApiHandler = async (context) => {
  await db.write(context.joinNodes(DEFAULT_LABEL));
  return {
    statusCode: 204
  }
}

/**
 * Drop connection between two nodes. 
 */
const drop: ApiHandler = async (context) => {
  await db.write(context.dropLink(DEFAULT_LABEL));
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
export const handler = Router({
  POST: join,
  DELETE: drop
}, apiSpec.paths["/{root}({rootId})/{entity}"]);
