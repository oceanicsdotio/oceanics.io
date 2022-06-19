"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bathysphere_json_1 = __importDefault(require("./shared/bathysphere.json"));
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend.
 */
const register = async ({ data: { user, provider } }) => {
    const { query } = new pkg_1.Links("Register", 0, 0, "").insert(provider, user);
    let records;
    try {
        records = await (0, middleware_1.connect)(query).then(middleware_1.transform);
    }
    catch {
        records = [];
    }
    if (records.length !== 1)
        return middleware_1.UNAUTHORIZED;
    return {
        data: { message: `Registered as a member of ${records[0].domain}.` },
        statusCode: 200
    };
};
/**
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data.
 */
const getToken = async ({ data: { user } }) => {
    console.log(user.cypherRepr());
    return {
        statusCode: 200,
        data: {
            token: jsonwebtoken_1.default.sign({ uuid: undefined }, process.env.SIGNING_KEY, { expiresIn: 3600 })
        }
    };
};
/**
 * Auth Router
 */
exports.handler = (0, middleware_1.NetlifyRouter)({
    GET: getToken,
    POST: register
}, bathysphere_json_1.default.paths["/auth"]);
