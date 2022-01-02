"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.hashPassword = void 0;
/**
 * Cloud function version of API
 */
const driver_1 = require("./shared/driver");
const neritics_1 = require("./shared/pkg/neritics");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
  * Securely store and anc compare passwords
  */
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
exports.hashPassword = hashPassword;
/**
 * Matching pattern based on basic auth information
 */
const authClaim = ({ email = "", password = "", secret = "" }) => new neritics_1.Node((0, driver_1.serialize)({ email, credential: (0, exports.hashPassword)(password, secret) }), null, "User");
/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend.
 */
const register = async ({ apiKey, password, secret, email }) => {
    // Empty array if there was an error
    const provider = new neritics_1.Node((0, driver_1.serialize)({ apiKey }), "p", "Provider");
    const user = new neritics_1.Node((0, driver_1.serialize)({
        email,
        uuid: crypto_1.default.randomUUID().replace(/-/g, ""),
        credential: (0, exports.hashPassword)(password, secret)
    }), "u", "User");
    const { query } = new neritics_1.Links("Register", 0, 0, "").insert(provider, user);
    let records;
    try {
        records = (0, driver_1.transform)(await (0, driver_1.connect)(query));
    }
    catch {
        records = [];
    }
    let statusCode;
    let message;
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
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data.
 */
const getToken = async (auth) => {
    const records = (0, driver_1.transform)(await (0, driver_1.connect)(authClaim(auth).load().query));
    let statusCode;
    let body;
    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({ message: "Unauthorized" });
    }
    else {
        statusCode = 200;
        const { uuid } = records[0][1];
        const token = jsonwebtoken_1.default.sign({ uuid }, process.env.SIGNING_KEY, { expiresIn: 3600 });
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
const manage = async ({ token }) => {
    const records = (0, driver_1.transform)(await (0, driver_1.connect)((0, driver_1.tokenClaim)(token, process.env.SIGNING_KEY).load().query));
    let statusCode;
    let body;
    if (records.length !== 1) {
        statusCode = 403;
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
 * Remove user and all attached nodes. This will
 * explicitly NOT remove any Providers. There is
 * a danger that if the User has somehow been linked
 * ad hoc to un-owned data, that another Users data
 * could be deleted.
 */
const remove = async (auth) => {
    const user = authClaim(auth);
    const allNodes = new neritics_1.Node(undefined, "a", undefined);
    const { query } = (new neritics_1.Links()).delete(user, allNodes);
    await (0, driver_1.connect)(query);
    return {
        statusCode: 204
    };
};
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.
 *
 * You can only access results for that test, although multiple
 * collections may be stored in a single place
 */
const handler = async ({ headers, body, httpMethod }) => {
    var _a;
    let data = JSON.parse(["POST", "PUT"].includes(httpMethod) ? body : "{}");
    const auth = (_a = headers["authorization"]) !== null && _a !== void 0 ? _a : "";
    const [email, password, secret] = auth.split(":");
    switch (httpMethod) {
        // Get access token
        case "GET":
            return (0, driver_1.catchAll)(getToken)({ email, password, secret });
        // Register new User
        case "POST":
            return (0, driver_1.catchAll)(register)(data);
        // Update User information
        case "PUT":
            const [_, token] = auth.split(":");
            return (0, driver_1.catchAll)(manage)({ token, ...data });
        // Remove User and all attached nodes 
        case "DELETE":
            return (0, driver_1.catchAll)(remove)({ email, password, secret });
        // Endpoint options
        case "OPTIONS":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET,POST,PUT,DELETE" }
            };
        // Invalid method
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: `Invalid HTTP Method` }),
                headers: { 'Content-Type': 'application/json' },
            };
    }
};
exports.handler = handler;
