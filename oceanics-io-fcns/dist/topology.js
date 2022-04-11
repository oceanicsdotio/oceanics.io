"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
/**
 * Connect two nodes.
 */
const join = async ({ data: { nodes: [left, right], label } }) => {
    await (0, middleware_1.connect)((new pkg_1.Links(label)).join(left, right).query);
    return {
        statusCode: 204
    };
};
/**
 * Drop connection between nodes.
 */
const drop = async ({ data: { nodes: [left, right] } }) => {
    await (0, middleware_1.connect)((new pkg_1.Links()).drop(left, right).query);
    return {
        statusCode: 204
    };
};
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.
 
 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
exports.handler = (0, middleware_1.NetlifyRouter)({
    POST: join,
    DELETE: drop
});
