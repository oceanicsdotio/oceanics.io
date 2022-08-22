import fetch from "node-fetch";
import type { Headers } from "node-fetch";
import { describe, expect, test } from '@jest/globals'
import crypto from "crypto";
import { asNodes, filterBaseRoute } from "../shared/middleware";
import spec from "./bathysphere.json";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

const HOSTNAME = "http://localhost:8888";
export const BASE_PATH = `${HOSTNAME}/.netlify/functions`;
export const API_PATH = `${HOSTNAME}/api`;

// Lookup for entity type by domain area
export const EXTENSIONS = {
  sensing: new Set([
    "Things",
    "Sensors",
    "Observations",
    "ObservedProperties",
    "FeaturesOfInterest",
    "HistoricalLocations",
    "Locations",
    "DataStreams",
  ]),
  tasking: new Set([
    "Tasks",
    "TaskingCapabilities",
    "Actuators"
  ]),
  auth: [
    "Provider",
    "User"
  ],
  governing: new Set([
    "Missions",
    "Agents",
    "Services",
    "Goals",
    "Assets",
    "Collections"
  ]),
};

// Format the Authorization header, picking up from env var if undefined
export const Authorization = (
  username: string = process.env.SERVICE_ACCOUNT_USERNAME ?? "",
  password: string = process.env.SERVICE_ACCOUNT_PASSWORD ?? "",
  secret: string = process.env.SERVICE_ACCOUNT_SECRET ?? ""
) => [username, password, secret].join(":")

// Shallow copy and insert uuid v4
const insertId = (props: Object) => Object({ ...props, uuid: crypto.randomUUID() });

// Insert id into each example
const specifyExamples = ([key, { examples = [] }]: [string, any]) => [key, examples.map(insertId)];

export const WELL_KNOWN_NODES = 
  Object.fromEntries(Object.entries(spec.components.schemas).map(specifyExamples));

/**
 * Parse and check the number of methods in the Allow header.
 * Does not check that the values are correct, only that the number of
 * them is what is expected.
 */
export const testAllowedMethodCount = (headers: Headers, expected: number) => {
  const allowed = headers.get("allow");
  const methods = (allowed || "").split(",");
  expect(typeof allowed).not.toBe("undefined");
  expect(allowed).not.toBeFalsy();
  expect(methods.length).toBe(expected)
};

/**
 * Use canonical test user information to get a Javascript Web Token.
 */
export const fetchToken = async () => {
  const response = await fetch(`${API_PATH}/auth`, {
    headers: {
      Authorization: Authorization(),
    },
  })
  expect(response.status).toBe(200);
  const {token} = await response.json();
  expect(typeof token).toBe("string");
  expect(token).not.toBeFalsy();
  return token;
}

  /**
   * Convenience method for creating consistent test user account under
   * multiple providers.
   */
   export const register = (apiKey: string) => {
    const body = JSON.stringify({
      email: process.env.SERVICE_ACCOUNT_USERNAME,
      password: process.env.SERVICE_ACCOUNT_PASSWORD,
      secret: process.env.SERVICE_ACCOUNT_SECRET
    })
    return fetch(`${API_PATH}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey ?? ""
      },
      body,
    });
  }


// Bind an auth token to fetch transaction
export const apiFetch = (token: string, url: string, method: string = "GET") => async (data?: Object) => {
  return fetch(url, {
    body: typeof data !== "undefined" ? JSON.stringify(data) : undefined,
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer:${token}`,
    },
  })
};

describe("middleware", function () {

  test("parses get entity path", function () {
    const uuid = `abcd`;
    const path = `api/DataStreams(${uuid})`;
    //@ts-ignore
    const nodeTransform = asNodes("GET", "");
    const segments = path.split("/").filter(filterBaseRoute)
    const node = nodeTransform(segments[0], 0);
    expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
  })

  test("parses post collection path", function () {
    const uuid = `abcd`;
    const path = `api/DataStreams`;
    //@ts-ignore
    const nodeTransform = asNodes("POST", JSON.stringify({ uuid }));
    const segments = path.split("/").filter(filterBaseRoute)
    const node = nodeTransform(segments[0], 0);
    expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
  })
})
