import { connect, metadata, NetlifyRouter } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import { Links } from "wasm";
import apiSpec from "./shared/bathysphere.json";

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
const create: ApiHandler = async ({ data: { user, nodes: [entity] } }) => {
    const { query } = (new Links("Create", 0, 0, "")).insert(user, entity)
    await connect(query)
    return {
        statusCode: 204
    }
}

export const handler = NetlifyRouter({
    GET: metadata, // shared with `/{entity}({uuid})`
    POST: create
}, apiSpec.paths["/{entity}"])