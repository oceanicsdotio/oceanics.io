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
    GET: middleware_1.metadata,
    DELETE: remove
}, bathysphere_json_1.default.paths["/{entity}({uuid})"]);
