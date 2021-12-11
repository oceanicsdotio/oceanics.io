"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3 = exports.Bucket = exports.connect = void 0;
/**
 * Cloud function version of API
 */
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const aws_sdk_1 = require("aws-sdk");
// import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";
const connect = async (query) => {
    const driver = neo4j_driver_1.default.driver(process.env.NEO4J_HOSTNAME, neo4j_driver_1.default.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY));
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
const authenticate = (event, context, target) => {
    var _a, _b;
    const db = null; // graph
    const [username, password] = ((_a = event.headers["authorization"]) !== null && _a !== void 0 ? _a : ":").split(":");
    if (username && username.includes("@") && username.includes(".")) { // basic auth
        try {
            //                 user = next(load_node(User(name=username), db))
            //                 assert custom_app_context.verify(password, user.credential)
        }
        catch {
            return [{ "message": "Invalid username or password" }, 403];
        }
    }
    else { // bearer token
        const secretKey = (_b = event.headers["x-api-key"]) !== null && _b !== void 0 ? _b : "salt";
        try {
            //                 decoded = TimedJSONWebSignatureSerializer(secretKey).loads(password)
            //                 uuid = decoded["uuid"]
            //                 user = next(load_node(User(uuid=uuid), db))
        }
        catch {
            //                 return {"Error": "Invalid authorization and/or x-api-key headers"}, 403
        }
    }
    const domain = username.split("@").pop();
    //             const provider = next(load_node(Providers(domain=domain), db))
    return target(event, context, null);
};
