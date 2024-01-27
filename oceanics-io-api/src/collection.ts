import * as db from "./shared/queries";
import { Router, paths } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import {
    metadataQuery,
    insertLinkedNodeQuery
} from "oceanics-io-api-wasm";

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property. 
 */
const GET: ApiHandler = async (context) => {
    const query = metadataQuery(context);
    const value = await db.readAndParse(query);
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
const POST: ApiHandler = async (context) => {
    const query = insertLinkedNodeQuery(context, "Create");
    db.write(query)
    return {
        statusCode: 204
    }
}

export const handler = Router({GET, POST}, paths["/{entity}"])