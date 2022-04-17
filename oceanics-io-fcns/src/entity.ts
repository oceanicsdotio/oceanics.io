import { connect, metadata, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import { Links } from "./shared/pkg";
import apiSpec from "./shared/bathysphere.json";

/**
 * Delete a pattern from the graph. Be careful, this can
 * remove all nodes matching the pattern. We usually restrict
 * to a pattern with an indexed/unique property when called
 * through the API to prevent unintentional data loss. 
 * 
 * The underlying query explicitly forbids dropping `Providers`
 * labels.
 */
const remove: ApiHandler = async ({data: {user, nodes: [entity]}}) => {
  const { query } = (new Links()).deleteChild(user, entity);
  await connect(query)
  return {
    statusCode: 204
  }
}

export const handler = NetlifyRouter({
  GET: metadata,  // shared with /collection
  DELETE: remove
}, apiSpec.paths["/{entity}({uuid})"])