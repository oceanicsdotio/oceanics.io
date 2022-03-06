"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const bathysphere_json_1 = __importDefault(require("./bathysphere.json"));
const ajv_1 = __importDefault(require("ajv"));
const API_NAME = "bathysphere";
const ajv = new ajv_1.default({ removeAdditional: true, strict: false });
ajv.addSchema(bathysphere_json_1.default, API_NAME);
const handler = async ({ body, httpMethod }) => {
    if (httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Invalid HTTP Method" }),
            headers: { "Content-Type": "application/json" }
        };
    }
    const { data, reference } = JSON.parse(body);
    let test;
    try {
        test = ajv.validate({ $ref: `${API_NAME}${reference}` }, data);
    }
    catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
            headers: { "Content-Type": "application/json" }
        };
    }
    let schema = bathysphere_json_1.default;
    let last = "#";
    for (const part of reference.split("/").filter((symbol) => symbol !== "#")) {
        schema = schema[part];
        if (typeof schema === "undefined") {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Validation Reference" }),
                headers: { "Content-Type": "application/json" }
            };
        }
        last = part;
    }
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            test,
            errors: ajv.errors,
            schema: bathysphere_json_1.default.components.schemas["Weight"]
        })
    };
};
exports.handler = handler;
