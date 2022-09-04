import jwt from "jsonwebtoken";
import apiSpec from "./shared/bathysphere.json";
import type { ApiHandler } from "./shared/middleware";

import { 
  connect, 
  recordsToProperties,
  NetlifyRouter,
  dematerialize,
  WRITE
} from "./shared/middleware";
import type { Properties } from "./shared/middleware";

import { Links, Node, ErrorDetail } from "oceanics-io-api-wasm";

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
  data: {
    user,
    provider
  }
}) => {
  const { query } = (new Links("Register", 0, 0, "")).insert(provider, user);
  let records: Properties[];
  try {
    const result = await connect(query, WRITE);
    records = recordsToProperties(result);
  } catch {
    records = [];
  }
  if (records.length !== 1) return ErrorDetail.unauthorized()
  return {
    data: {message: `Registered as a member of ${records[0].domain}.`},
    statusCode: 200
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
  const {uuid} = dematerialize(user);
  return {
    statusCode: 200,
    data: {
      token: jwt.sign({ uuid }, process.env.SIGNING_KEY??"", { expiresIn: 3600 })
    }
  }
};

// Just a stub for now, to enable testing of bearer auth
const manage: ApiHandler = async () => {
  return {
    statusCode: 501
  }
}

const remove: ApiHandler = async ({data: {user}}) => {
  const { query } = new Links().delete(user, new Node());
  try {
    await connect(query, WRITE);
  } catch {
    return ErrorDetail.unauthorized();
  }
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