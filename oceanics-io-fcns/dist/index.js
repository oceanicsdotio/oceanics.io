"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const middleware_1 = require("./shared/middleware");
const wasm_1 = require("wasm");
const bathysphere_json_1 = __importDefault(require("./shared/bathysphere.json"));
// Convenience methods for chaining
const restricted = new Set(["Provider", "User"]);
const extractLabel = ({ _fields: [label] }) => label;
const filterLabels = (label) => !restricted.has(label);
const uniqueLabels = ({ records }) => records.flatMap(extractLabel).filter(filterLabels);
/**
 * Get an array of all collections by Node type
 */
const index = async () => {
    const filteredLabels = await (0, middleware_1.connect)(wasm_1.Node.allLabels().query).then(uniqueLabels);
    return {
        statusCode: 200,
        data: filteredLabels.map((label) => Object({
            name: label,
            url: `/api/${label}`
        }))
    };
};
// HTTP Router
exports.handler = (0, middleware_1.NetlifyRouter)({
    GET: index
}, bathysphere_json_1.default.paths["/"]);
