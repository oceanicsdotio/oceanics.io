import { connect, transform, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler, Properties } from "./shared/middleware";
import { Links } from "./shared/pkg";

/**
 * Create some nodes, usually one, within the graph. This will
 * automatically be attached to User and Provider nodes (internal).
 * 
 * Blank and null values are ignored, and will not overwrite existing
 * properties. This implies that once a property is set once, it cannot
 * be "unset" without special handling. 
 * 
 * Location data receives additional processing logic internally.
 */
const create: ApiHandler = async ({data: {user, nodes: [entity]}}) => {
  const { query } = (new Links("Create", 0, 0, "")).insert(user, entity)
  await connect(query)
  return {
    statusCode: 204
  }
}

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property. 
 */
const metadata: ApiHandler = async ({data: {user, nodes: [entity]}}) => {
  const { query } = (new Links()).query(user, entity, entity.symbol);
  const value = (await connect(query, transform)).map((node: [string, Properties]) => node[1]);
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
const remove: ApiHandler = async ({data: {user, nodes: [entity]}}) => {
  const { query } = (new Links()).deleteChild(user, entity);
  await connect(query)
  return {
    statusCode: 204
  }
}

export const handler = NetlifyRouter({
  get: metadata,
  post: create,
  delete: remove
})