"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * Cloud function version of API
 */
const driver_1 = require("./shared/driver");
/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend.
 */
const register = async (auth) => {
    // Empty array if there was an error
    const records = await (0, driver_1.newUserQuery)(auth);
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
    const records = await (0, driver_1.authClaim)(auth).fetch();
    let statusCode;
    let body;
    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({ message: "Unauthorized" });
    }
    else {
        statusCode = 200;
        const { uuid } = records[0][1];
        const token = (0, driver_1.createToken)(uuid, process.env.SIGNING_KEY);
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
    const records = await (0, driver_1.tokenClaim)(token, process.env.SIGNING_KEY).fetch();
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
 * Remove user and all attached nodes. This will
 * explicitly NOT remove any Providers. There is
 * a danger that if the User has somehow been linked
 * ad hoc to un-owned data, that another Users data
 * could be deleted.
 */
const remove = async (auth) => {
    await driver_1.Link.deleteAllOwned(auth);
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
    let { email, password, apiKey, secret } = JSON.parse(["POST", "PUT"].includes(httpMethod) ? body : "{}");
    const auth = (_a = headers["authorization"]) !== null && _a !== void 0 ? _a : "";
    switch (httpMethod) {
        // Get access token
        case "GET":
            [email, password, secret] = auth.split(":");
            return (0, driver_1.catchAll)(getToken)({ email, password, secret });
        // Register new User
        case "POST":
            return (0, driver_1.catchAll)(register)({ email, password, secret, apiKey });
        // Update User information
        case "PUT":
            const [_, token] = auth.split(":");
            return (0, driver_1.catchAll)(manage)({ token, email, password });
        // Remove User and all attached nodes 
        case "DELETE":
            [email, password, secret] = auth.split(":");
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
