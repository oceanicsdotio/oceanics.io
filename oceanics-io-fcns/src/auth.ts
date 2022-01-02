/**
 * Cloud function version of API
 */
import { connect, transform, catchAll, serialize, tokenClaim } from "./shared/driver";
import { Node, Links } from "./shared/pkg/neritics";
import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {hashPassword} from "oceanics-io-client/dist/openapi";

/**
 * Generic interface for all of the method-specific handlers.
 */
 export interface IAuth {
  email: string;
  password: string;
  secret: string;
  apiKey?: string;
  token?: string;
}

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
const register = async ({ apiKey, password, secret, email }: IAuth) => {
  // Empty array if there was an error

  const provider = new Node(serialize({ apiKey }), "p", "Provider");
  const user = new Node(serialize({
    email,
    uuid: crypto.randomUUID().replace(/-/g, ""),
    credential: hashPassword(password, secret)
  }), "u", "User");
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
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
  let body: string;

  if (records.length !== 1) {
    statusCode = 403;
    body = JSON.stringify({ message: "Unauthorized" });
  } else {
    statusCode = 200;
    const { uuid } = records[0][1];
    const token = jwt.sign({ uuid }, process.env.SIGNING_KEY, { expiresIn: 3600 })
    body = JSON.stringify({ token })
  }
  return {
    statusCode,
    body,
    headers: { 'Content-Type': 'application/json' },
  }
};


/**
 * Update account information
 */
const manage = async ({ token }: IAuth) => {

  const records = transform(await connect(tokenClaim(token, process.env.SIGNING_KEY).load().query));

  let statusCode: number;
  let body: string | undefined;

  if (records.length !== 1) {
    statusCode = 403;
    body = JSON.stringify({ message: "Unauthorized" });
  } else {
    // const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
    // const cypher = previous.mutate(insert);
    // await connect(cypher.query);
    statusCode = 200;
    body = JSON.stringify({ message: "OK" });
  }
  return {
    statusCode,
    body
  }
};

/**
 * Remove user and all attached nodes. This will
 * explicitly NOT remove any Providers. There is
 * a danger that if the User has somehow been linked
 * ad hoc to un-owned data, that another Users data
 * could be deleted.
 */
const remove = async (auth: IAuth) => {
  const user = authClaim(auth);
  const allNodes = new Node(undefined, "a", undefined)
  const { query } = (new Links()).delete(user, allNodes);
  await connect(query);
  return {
    statusCode: 204
  }
}

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
const handler: Handler = async ({ headers, body, httpMethod }) => {
  
  let data = JSON.parse(["POST", "PUT"].includes(httpMethod) ? body : "{}");
  const auth = headers["authorization"] ?? "";
  const [email, password, secret] = auth.split(":");
  switch (httpMethod) {
    // Get access token
    case "GET":
      return catchAll(getToken)({ email, password, secret });
    // Register new User
    case "POST":
      return catchAll(register)(data);
    // Update User information
    case "PUT":
      const [_, token] = auth.split(":");
      return catchAll(manage)({ token, ...data });
    // Remove User and all attached nodes 
    case "DELETE":
      return catchAll(remove)({ email, password, secret });
    // Endpoint options
    case "OPTIONS":
      return {
        statusCode: 204,
        headers: { "Allow": "OPTIONS,GET,POST,PUT,DELETE" }
      }
    // Invalid method
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: `Invalid HTTP Method` }),
        headers: { 'Content-Type': 'application/json' },
      };
  }
}

export { handler };