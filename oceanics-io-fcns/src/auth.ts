/**
 * Cloud function version of Auth API.
 */
import { connect, transform, serialize, tokenClaim, materialize } from "./shared/driver";
import { router } from "./shared/middleware";
import { Node, Links } from "./shared/pkg";
import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import jwt from "jsonwebtoken";

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
 * Securely store and anc compare passwords
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
const register = async ({ apiKey, password, secret, email }: IAuth) => {
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





const parseAuth = (authorization="") => {
  const [email, password, secret] = authorization.split(":");
  return { email, password, secret}
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
const handler: Handler = async ({ headers, body, httpMethod, path }) => {
  
  const ROUTER = router()
  ROUTER.add("/", {
    GET: getToken,  // Get access token
    POST: register, // Register new User
    PUT: manage,  // Update User information
    DELETE: remove  // Remove User and all attached nodes 
  })
  ROUTER.before()

  
  let data = JSON.parse(["POST", "PUT"].includes(httpMethod) ? body : "{}");
  const [email, password, secret] = (headers["authorization"] ?? "").split(":");
  return ROUTER.handle(httpMethod, )
  switch (httpMethod) {
    case "GET":
      return getToken({ email, password, secret});
    case "POST":
      return register(data);
    case "PUT":
      return manage({ token: password, ...data });
    case "DELETE":
      return remove({ email, password, secret });
  }
}

export { handler };