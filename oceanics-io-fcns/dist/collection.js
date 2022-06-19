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
    console.log({ entity: entity.patternOnly() });
    const result = await (0, middleware_1.connect)(query);
    console.log({ result });
    return {
        statusCode: 204
    };
};
exports.handler = (0, middleware_1.NetlifyRouter)({
    GET: middleware_1.metadata,
    POST: create
}, bathysphere_json_1.default.paths["/{entity}"]);
