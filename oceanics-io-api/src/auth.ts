import jwt from "jsonwebtoken";
import apiSpec from "./shared/bathysphere.json";
import { NetlifyRouter } from "./shared/middleware";
import * as db from "./shared/queries"
import type { ApiHandler } from "./shared/middleware";
import { Node, ErrorDetail } from "oceanics-io-api-wasm";

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
 * Create a new account using email address. We don't perform
 * any validation of inputs here, such as for email address and
 * excluded passwords. Assume this is delegated to frontend. 
 */
const register: ApiHandler = async ({
  context
}) => {
  try {
    const domain = await db.register(context.provider, user);
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
const getToken: ApiHandler = async ({
  data: {
    user
  }
}) => {
  const {uuid} = Node.dematerialize(user);
  return {
    statusCode: 200,
    data: {
      token: jwt.sign({ uuid }, process.env.SIGNING_KEY??"", { expiresIn: 3600 })
    }
  }
};

/**
 * Change auth details, such as updating e-mail or password.
 */
const manage: ApiHandler = async () => {
  return {
    statusCode: 501
  }
}

/**
 * Detach and delete all child nodes. The underlying query
 * generator prevents internal Nodes like Provider from
 * being dropped.
 */
const remove: ApiHandler = async ({data: {user}}) => {
  await db.remove(user, new Node());
  return {
    statusCode: 204
  }
}

export const handler = NetlifyRouter({
  GET: getToken,
  POST: register,
  PUT: manage,
  DELETE: remove,
}, apiSpec.paths["/auth"])