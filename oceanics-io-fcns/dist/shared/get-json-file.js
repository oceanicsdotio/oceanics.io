"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const getJson = async ({ queryStringParameters }) => {
    const { service = "bivalve", key = "index", ext = "json", } = queryStringParameters;
    try {
        const { Body } = await s3.getObject({
            Bucket,
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
const spacesEndpoint = new aws_sdk_1.Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new aws_sdk_1.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const getCsv = async ({ queryStringParameters }) => {
    var _a;
    const { Service = "MidcoastMaineMesh", Key = "midcoast_elements", Ext = "csv", } = queryStringParameters;
    try {
        const { Body } = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();
        const CSV = ((_a = Body === null || Body === void 0 ? void 0 : Body.toString('utf-8')) !== null && _a !== void 0 ? _a : "")
            .split("\n")
            .slice() // copy to prevent readable body disappearing
            .map(line => line.split(",").map(x => x.trim()).slice(1, 4));
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CSV)
        };
    }
    catch (err) {
        return {
            statusCode: err.statusCode || 500,
            body: err.message
        };
    }
};
