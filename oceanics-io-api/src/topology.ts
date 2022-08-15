import { connect, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import { Links } from "oceanics-io-wasm-api-node";
import apiSpec from "./shared/bathysphere.json";

// Don't currently pass custom label through the API
const DEFAULT_LABEL = "Link"

/**
 * Connect two nodes.
 */
const join: ApiHandler = async ({ data: { nodes: [left, right], label=DEFAULT_LABEL } }) => {
  await connect((new Links(label)).join(left, right).query);
  return {
    statusCode: 204
  }
}

/**
 * Drop connection between two nodes. 
 */
const drop: ApiHandler = async ({ data: { nodes: [left, right] } }) => {
  await connect((new Links()).drop(left, right).query);
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
 
 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
export const handler = NetlifyRouter({
  POST: join,
  DELETE: drop
}, apiSpec.paths["/{root}({rootId})/{entity}"]);
