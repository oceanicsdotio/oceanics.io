
import * as db from "./shared/queries";
import { paths, Router } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import {
  registerQuery,
  basicAuthQuery,
  issueUserToken,
  dropAllLinkedNodesQuery,
  unauthorizedMultipleMatchingCredentials,
  unauthorizedNoMatchingCredentials
} from "oceanics-io-api-wasm";

/**
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend. 
 */
const POST: ApiHandler = async (context) => {
  const query = registerQuery(context, "Register");
  const records = await db.writeAndParse(query);
  if (records.length === 0) {
    throw unauthorizedNoMatchingCredentials("auth.post");
  } else if (records.length > 1) {
    throw unauthorizedMultipleMatchingCredentials("auth.post");
  }
  
  const [{domain}] = records as {domain: string}[];
  return {
    data: {
      message: `Registered as a member of ${domain}.`
    },
    statusCode: 200
  }
};

/**
 * Exchange user name and password for JWT. In addition to the usual encoded
 * data per the standard, it includes the UUID for the User, as this is the
 * information needed when validating access to data. 
 */
const GET: ApiHandler = async (context) => {
  const query = basicAuthQuery(context);
  console.log({query})
  const records = await db.readAndParse(query);
  if (records.length === 0) {
    throw unauthorizedNoMatchingCredentials("auth.get");
  } else if (records.length > 1) {
    throw unauthorizedMultipleMatchingCredentials("auth.get");
  }
  const token = issueUserToken(process.env.SIGNING_KEY);
  return {
    statusCode: 200,
    data: { token }
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
 * Detach and delete all child nodes. The underlying query generator prevents internal 
 * Nodes like Provider from being dropped.
 */
const DELETE: ApiHandler = async (context) => {
  await db.write(dropAllLinkedNodesQuery(context));
  return {
    statusCode: 204
  }
}

export const handler = Router({GET, POST, PUT, DELETE}, paths["/auth"])
