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
 * Create some nodes, usually one, within the graph. This will
 * automatically be attached to User and Provider nodes (internal).
 * 
 * Blank and null values are ignored, and will not overwrite existing
 * properties. This implies that once a property is set once, it cannot
 * be "unset" without special handling. 
 * 
 * Location data receives additional processing logic internally.
 */
const create: ApiHandler = async (context) => {
    await db.create("Create", context.user, context.left)
    return {
        statusCode: 204
    }
}

export const handler = Router({
    GET: metadata, // shared with `/{entity}({uuid})`
    POST: create
}, apiSpec.paths["/{entity}"])