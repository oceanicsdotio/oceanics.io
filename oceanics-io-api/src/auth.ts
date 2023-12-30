import { ErrorDetail } from "oceanics-io-api-wasm";
import * as db from "./shared/queries";
import apiSpec from "./shared/bathysphere.json";
import { Router } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";

/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend. 
 */
const POST: ApiHandler = async (context) => {
  try {
    const records = await db.writeAndParse(context.register("Register"));
    if (records.length !== 1)
      throw Error(`No provider match (N=${records.length})`);
    const [{domain}] = records as {domain: string}[];
    return {
      data: {
        message: `Registered as a member of ${domain}.`
      },
      statusCode: 200
    }
  } catch {
    return ErrorDetail.unauthorized();
  }
};

/**
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data. 
 */
const GET: ApiHandler = async (context) => {
  try {
    const token = context.issueUserToken(process.env.SIGNING_KEY);
    return {
      statusCode: 200,
      data: { token }
    }
  } catch (error) {
    return JSON.parse(error.message)
  }
};

/**
 * Change auth details, such as updating e-mail or password.
 */
const PUT: ApiHandler = async () => {
  return {
    statusCode: 501
  }
}

/**
 * Detach and delete all child nodes. The underlying query
 * generator prevents internal Nodes like Provider from
 * being dropped.
 */
const DELETE: ApiHandler = async (context) => {
  await db.write(context.dropAllLinkedNodes());
  return {
    statusCode: 204
  }
}

export const handler = Router(
  { GET, POST, PUT, DELETE }, 
  apiSpec.paths["/auth"]
)
