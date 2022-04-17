import crypto from "crypto";
import jwt from "jsonwebtoken";
import apiSpec from "./shared/bathysphere.json";
import type { ApiHandler } from "./shared/middleware";

import { 
  connect, 
  transform,
  materialize,
  NetlifyRouter, 
  hashPassword,
  UNAUTHORIZED
} from "./shared/middleware";

import { Links } from "./shared/pkg";

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
  data: { apiKey, password, secret, email }
}) => {
  const provider = materialize({ apiKey }, "p", "Provider");
  const user = materialize({
    email,
    uuid: crypto.randomUUID().replace(/-/g, ""),
    credential: hashPassword(password, secret)
  }, "u", "User");
  
  const { query } = new Links("Register", 0, 0, "").insert(provider, user);
  let records: any;
  try {
    records = await connect(query, transform);
  } catch {
    records = [];
  }
  if (records.length !== 1) return UNAUTHORIZED
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
  console.log({user})

  return {
    statusCode: 200,
    data: {
      token: jwt.sign({ uuid: undefined }, process.env.SIGNING_KEY, { expiresIn: 3600 })
    }
  }
};

/**
 * Auth Router
 */
export const handler = NetlifyRouter({
  GET: getToken,
  POST: register
}, apiSpec.paths["/auth"])