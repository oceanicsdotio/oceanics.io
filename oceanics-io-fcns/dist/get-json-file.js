"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("./shared/utils");
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const handler = async ({ queryStringParameters }) => {
    const { service = "bivalve", key = "index", ext = "json", } = queryStringParameters;
    try {
        const { Body } = await utils_1.s3.getObject({
            Bucket: utils_1.Bucket,
            Key: `${service}/${key}.${ext}`
        }).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: Body.toString('utf-8')
        };
    }
    catch (err) {
        return {
            statusCode: err.statusCode || 500,
            body: err.message
        };
    }
};
exports.handler = handler;
