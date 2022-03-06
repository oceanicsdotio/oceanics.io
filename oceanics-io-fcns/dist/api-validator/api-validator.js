"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// https://ajv.js.org/standalone.html#using-the-validation-function-s
const validate_1 = __importDefault(require("../shared/validate"));
const handler = async ({}) => {
    const pass = 1.0;
    const fail = { value: 0.0 };
    const validateWeight = validate_1.default["#/components/schemas/Weight"];
    console.log({ validateWeight });
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pass: validateWeight(pass),
            fail: validateWeight(fail)
        })
    };
};
exports.handler = handler;
