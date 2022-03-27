"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const driver_1 = require("./shared/driver");
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
const BASE_PATH = "/";
/**
 * Securely store and compare passwords
 */
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
/**
 * Matching pattern based on basic auth information
 */
const authClaim = ({ email = "", password = "", secret = "" }) => new pkg_1.Node((0, driver_1.serialize)({ email, credential: hashPassword(password, secret) }), null, "User");
/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend.
 */
async function register({ apiKey, password, secret, email }) {
    // Empty array if there was an error
    const provider = (0, driver_1.materialize)({ apiKey }, "p", "Provider");
    const user = (0, driver_1.materialize)({
        email,
        uuid: crypto_1.default.randomUUID().replace(/-/g, ""),
        credential: hashPassword(password, secret)
    }, "u", "User");
    const { query } = new pkg_1.Links("Register", 0, 0, "").insert(provider, user);
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
        data: { message }
    };
}
;
/**
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data.
 */
const getToken = async (auth) => {
    const records = (0, driver_1.transform)(await (0, driver_1.connect)(authClaim(auth).load().query));
    let statusCode;
    let data;
    if (records.length !== 1) {
        statusCode = 403;
        data = { message: "Unauthorized" };
    }
    else {
        statusCode = 200;
        const { uuid } = records[0][1];
        const token = jsonwebtoken_1.default.sign({ uuid }, process.env.SIGNING_KEY, { expiresIn: 3600 });
        data = { token };
    }
    return {
        statusCode,
        data
    };
};
/**
 * Update account information
 */
const manage = async ({ token }) => {
    const { query } = (0, driver_1.tokenClaim)(token, process.env.SIGNING_KEY).load();
    const records = (0, driver_1.transform)(await (0, driver_1.connect)(query));
    if (records.length !== 1) {
        return {
            statusCode: 403,
            data: { message: "Unauthorized" }
        };
    }
    else {
        // const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
        // const cypher = previous.mutate(insert);
        // await connect(cypher.query);
        return {
            statusCode: 204
        };
    }
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
    const allNodes = new pkg_1.Node(undefined, "a", undefined);
    const { query } = (new pkg_1.Links()).delete(user, allNodes);
    await (0, driver_1.connect)(query);
    return {
        statusCode: 204
    };
};
/**
 * Auth Router
 */
const handler = async (request) => {
    const result = await (0, middleware_1.router)().add(BASE_PATH, {
        get: getToken,
        post: register,
        put: manage,
        delete: remove
    })
        .before(BASE_PATH, ["get", "delete"], middleware_1.withBasicAuth)
        .before(BASE_PATH, ["put"], middleware_1.withBearerToken)
        .before(BASE_PATH, ["post", "put"], middleware_1.jsonRequest)
        .after(BASE_PATH, ["get", "post", "put", "delete"], middleware_1.jsonResponse)
        .handle(request);
    console.log(result);
    return result;
};
exports.handler = handler;
