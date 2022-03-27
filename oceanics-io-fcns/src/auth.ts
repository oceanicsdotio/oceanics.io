import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { 
  connect, 
  transform,
  serialize, 
  tokenClaim, 
  materialize 
} from "./shared/driver";

import { 
  router, 
  jsonRequest, 
  jsonResponse, 
  withBasicAuth, 
  withBearerToken
} from "./shared/middleware";

import { 
  Node,
  Links
} from "./shared/pkg";

const BASE_PATH = "";

/**
 * Generic interface for all of the HTTP method-specific handlers.
 */
export interface IAuth {
  email: string;
  password: string;
  secret: string;
  apiKey?: string;
  token?: string;
}

/**
 * Securely store and compare passwords
 */
const hashPassword = (password: string, secret: string) =>
  crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

/**
 * Matching pattern based on basic auth information
 */
const authClaim = ({ email = "", password = "", secret = "" }: IAuth) =>
  new Node(serialize({ email, credential: hashPassword(password, secret) }), null, "User");

/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend. 
 */
async function register ({ apiKey, password, secret, email }: IAuth) {
  // Empty array if there was an error
  const provider = materialize({ apiKey }, "p", "Provider");
  const user = materialize({
    email,
    uuid: crypto.randomUUID().replace(/-/g, ""),
    credential: hashPassword(password, secret)
  }, "u", "User");
  
  const { query } = new Links("Register", 0, 0, "").insert(provider, user);

  let records: any;
  try {
    records = transform(await connect(query));
  } catch {
    records = [];
  }

  let statusCode: number;
  let message: string;
  if (records.length !== 1) {
    message = (
      "Registration requires email, password, and API key in the request body. " +
      "This is used to associate your account with a public or private ingress."
    );
    statusCode = 403;
  } else {
    message = `Registered as a member of ${records[0][1].domain}.`;
    statusCode = 200;
  }
  return {
    statusCode,
    data: { message }
  }
};

/**
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data. 
 */
const getToken = async (auth: IAuth) => {
  const records = transform(await connect(authClaim(auth).load().query))
  let statusCode: number;
  let data: object;

  if (records.length !== 1) {
    statusCode = 403;
    data = { message: "Unauthorized" };
  } else {
    statusCode = 200;
    const { uuid } = records[0][1];
    const token = jwt.sign({ uuid }, process.env.SIGNING_KEY, { expiresIn: 3600 })
    data = { token }
  }
  return {
    statusCode,
    data
  }
};

/**
 * Update account information
 */
const manage = async ({ token }: IAuth) => {
  const {query} = tokenClaim(token, process.env.SIGNING_KEY).load();
  const records = transform(await connect(query));

  if (records.length !== 1) {
    return {
      statusCode: 403,
      data: { message: "Unauthorized" }
    };
  } else {
    // const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
    // const cypher = previous.mutate(insert);
    // await connect(cypher.query);
    return {
      statusCode: 204
    };
  }
};


const _router = router().add(BASE_PATH, {
  get: getToken,
  post: register,
  put: manage
}).before(BASE_PATH, ["get", "delete"], withBasicAuth)
.before(BASE_PATH, ["put"], withBearerToken)
.before(BASE_PATH, ["post", "put"], jsonRequest)
.after(BASE_PATH, ["get", "post", "put"], jsonResponse);

/**
 * Auth Router
 */
const handler: Handler = async (request) => {
  const result = await _router.handle(request)
  console.log(result)
  return result
}

export { handler: _router.handle };