"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
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
const create = async ({ data: { user, nodes: [entity] } }) => {
    const { query } = (new pkg_1.Links("Create", 0, 0, "")).insert(user, entity);
    await (0, middleware_1.connect)(query);
    return {
        statusCode: 204
    };
};
/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property.
 */
const metadata = async ({ data: { user, nodes: [entity] } }) => {
    const { query } = (new pkg_1.Links()).query(user, entity, entity.symbol);
    const value = (await (0, middleware_1.connect)(query, middleware_1.transform)).map((node) => node[1]);
    return {
        statusCode: 200,
        data: {
            "@iot.count": value.length,
            value,
        }
    };
};
/**
 * Delete a pattern from the graph. Be careful, this can
 * remove all nodes matching the pattern. We usually restrict
 * to a pattern with an indexed/unique property when called
 * through the API to prevent unintentional data loss.
 *
 * The underlying query explicitly forbids dropping `Providers`
 * labels.
 */
const remove = async ({ data: { user, nodes: [entity] } }) => {
    const { query } = (new pkg_1.Links()).deleteChild(user, entity);
    await (0, middleware_1.connect)(query);
    return {
        statusCode: 204
    };
};
exports.handler = (0, middleware_1.NetlifyRouter)({
    GET: metadata,
    POST: create,
    DELETE: remove
});
