"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// https://ajv.js.org/standalone.html#using-the-validation-function-s
const bathysphere_json_1 = __importDefault(require("./bathysphere.json"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ removeAdditional: true });
ajv.addSchema(bathysphere_json_1.default, "bathysphere");
const handler = async ({ body, httpMethod, path }) => {
    // const valid = ajv.validate({ $ref: 'bathysphere#/definitions/Employee' }, {
    //   name: "John"
    // });
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ok: true,
            path,
            schema: bathysphere_json_1.default["/{entity}"]["post"]
            // pass: validateWeight(pass),
            // fail: validateWeight(fail)
        })
    };
};
exports.handler = handler;
