"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * Cloud function version of API
 */
const utils_1 = require("./shared/utils");
const cypher_1 = require("./shared/cypher");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = (recs) => recs.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
/**
 * Securely store and anc compare passwords
 */
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
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
/**
 * Create a new account using email address
 */
const register = async ({ email, password, secret, apiKey }) => {
    const hash = hashPassword(password, secret);
    const uuid = crypto_1.default.randomUUID().replace(/-/g, "");
    const node = new cypher_1.GraphNode(`apiKey: '${apiKey}'`, "p", ["Provider"]);
    const user = new cypher_1.GraphNode(`email: '${email}', credential: '${hash}', uuid: '${uuid}'`, "u", ["User"]);
    const cypher = new cypher_1.Link("Register", 0, 0, "").insert(node, user);
    let records;
    let statusCode;
    let message;
    try {
        records = transform((await (0, utils_1.connect)(cypher.query)).records);
    }
    catch {
        records = [];
    }
    if (records.length !== 1) {
        message = ("Registration requires email, password, and API key in the request body. " +
            "This is used to associate your account with a public or private ingress.");
        statusCode = 403;
    }
    else {
        message = `Registered as a member of ${records[0][1].domain}.`;
        statusCode = 200;
    }
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    };
};
/**
 * Exchange user name and password for JWT
 */
const getToken = async ({ email, password, secret }) => {
    var _a;
    const hash = hashPassword(password, secret);
    const node = new cypher_1.GraphNode(`email: '${email}', credential: '${hash}'`, null, ["User"]);
    const records = transform((await (0, utils_1.connect)(node.load().query)).records);
    let statusCode;
    let body;
    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({ message: "Unauthorized" });
    }
    else {
        statusCode = 200;
        const { uuid } = records[0][1];
        const token = jsonwebtoken_1.default.sign({ uuid }, (_a = process.env.SIGNING_KEY) !== null && _a !== void 0 ? _a : "", { expiresIn: 3600 });
        body = JSON.stringify({ token });
    }
    return {
        statusCode,
        body,
        headers: { 'Content-Type': 'application/json' },
    };
};
/**
 * Update account information
 */
const manage = async ({ token, email, password }) => {
    var _a;
    const claim = jsonwebtoken_1.default.verify(token !== null && token !== void 0 ? token : "", (_a = process.env.SIGNING_KEY) !== null && _a !== void 0 ? _a : "");
    const uuid = claim["uuid"];
    const node = new cypher_1.GraphNode(`uuid: '${uuid}'`, null, ["User"]);
    const records = transform((await (0, utils_1.connect)(node.load().query)).records);
    let statusCode;
    let body;
    if (records.length !== 1) {
        statusCode = 403,
            body = JSON.stringify({ message: "Unauthorized" });
    }
    else {
        // const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
        // const cypher = previous.mutate(insert);
        // await connect(cypher.query);
        statusCode = 200;
        body = JSON.stringify({ message: "OK" });
    }
    return {
        statusCode,
        body
    };
};
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.
 *
 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const handler = async ({ headers, body, httpMethod }) => {
    var _a;
    let { email, password, apiKey, secret } = JSON.parse(body !== null && body !== void 0 ? body : "{}");
    const auth = (_a = headers["authorization"]) !== null && _a !== void 0 ? _a : "";
    switch (httpMethod) {
        case "GET":
            [email, password, secret] = auth.split(":");
            return catchAll(getToken)({ email, password, secret });
        case "POST":
            return catchAll(register)({ email, password, secret, apiKey });
        case "PUT":
            const [_, token] = auth.split(":");
            return catchAll(manage)({ token, email, password });
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: `Invalid HTTP Method` }),
                headers: { 'Content-Type': 'application/json' },
            };
    }
};
exports.handler = handler;
