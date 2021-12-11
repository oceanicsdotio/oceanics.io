"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAll = exports.s3 = exports.Bucket = exports.connect = exports.uuid4 = exports.hashPassword = void 0;
/**
 * Cloud function version of API
 */
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const aws_sdk_1 = require("aws-sdk");
const crypto_1 = __importDefault(require("crypto"));
// import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";
/**
 * Securely store and anc compare passwords
 */
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
exports.hashPassword = hashPassword;
const uuid4 = () => crypto_1.default.randomUUID().replace(/-/g, "");
exports.uuid4 = uuid4;
const connect = async (query) => {
    var _a, _b;
    const driver = neo4j_driver_1.default.driver((_a = process.env.NEO4J_HOSTNAME) !== null && _a !== void 0 ? _a : "", neo4j_driver_1.default.auth.basic("neo4j", (_b = process.env.NEO4J_ACCESS_KEY) !== null && _b !== void 0 ? _b : ""));
    const session = driver.session({ defaultAccessMode: neo4j_driver_1.default.session.READ });
    const result = await session.run(query);
    await driver.close();
    return result;
};
exports.connect = connect;
const spacesEndpoint = new aws_sdk_1.Endpoint('nyc3.digitaloceanspaces.com');
exports.Bucket = "oceanicsdotio";
exports.s3 = new aws_sdk_1.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});
/**
 * Make sure we don't leak anything...
 */
function catchAll(wrapped) {
    return (args) => {
        try {
            return wrapped(args);
        }
        catch {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Server Error" })
            };
        }
    };
}
exports.catchAll = catchAll;
