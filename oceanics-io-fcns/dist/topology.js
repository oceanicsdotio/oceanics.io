"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
const bathysphere_json_1 = __importDefault(require("./shared/bathysphere.json"));
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
 * Drop connection between two nodes.
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
}, bathysphere_json_1.default.paths["/{root}({rootId})/{entity}"]);
