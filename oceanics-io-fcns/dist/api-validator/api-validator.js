"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// https://ajv.js.org/standalone.html#using-the-validation-function-s
const bathysphere_json_1 = __importDefault(require("./bathysphere.json"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ removeAdditional: true, strict: false });
ajv.addSchema(bathysphere_json_1.default, "bathysphere");
const handler = async ({ body, httpMethod, path }) => {
    const one = ajv.validate({ $ref: 'bathysphere#/components/schemas/Weight' }, 1.0);
    const negative = ajv.validate({ $ref: 'bathysphere#/components/schemas/Weight' }, -1.0);
    const obj = ajv.validate({ $ref: 'bathysphere#/components/schemas/Weight' }, { value: 1.0 });
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ok: true,
            path,
            test: {
                one,
                negative,
                obj
            },
            errors: ajv.errors,
            schema: bathysphere_json_1.default.components.schemas["Weight"]
            // pass: validateWeight(pass),
            // fail: validateWeight(fail)
        })
    };
};
exports.handler = handler;
