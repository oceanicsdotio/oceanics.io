import fetch from "node-fetch";
import type { Headers } from "node-fetch";
import { expect } from '@jest/globals';
import crypto from "crypto";
import API_SPECIFICATION from "./src/shared/bathysphere.json";
import fs from "fs";
// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

export const CACHE = "./src/shared/nodes.json";
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

export type Node = {uuid?: string};
export type Schema = { examples: Node[] };
export type SchemaEntry = [string, Schema];
export type NodeTypeTuple = [string, number];
export type NodeTuple = [string, string, Node];

/**
 * Translate from OpenAPI schema examples to simple
 * table used in per-entity unit concurrent tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */ 
export let getNodes = (cache_hit: boolean = true): NodeTuple[] => {
  // Strip navigation props from instance
  const filterNavigation = ([key]: [string, any]) => !key.includes("@");

  // Unpack UUI and de-normalize
  const flattenNode = (label: string) => {
    return (props: Node): NodeTuple => {
      const uuid = crypto.randomUUID();
      return [
        label, 
        uuid, 
        Object.fromEntries(Object.entries({ ...props, uuid }).filter(filterNavigation))
      ]
    }
  }
  // OpenAPI schema to flat list of examples
  const schemaToLookup = ([label, {examples=[]}]: SchemaEntry): NodeTuple[] =>
    examples.map(flattenNode(label));

  // Strip lookup entries not in Sensing
  const filterSensing = ([label]: NodeTuple): boolean => 
    EXTENSIONS.sensing.has(label);

  const CACHE = "./src/shared/nodes.json";
  if (cache_hit) {
    const text = fs.readFileSync(CACHE, "utf-8");
    const value = JSON.parse(text);
    return value;
  } else {
    const value = (Object.entries(API_SPECIFICATION.components.schemas) as SchemaEntry[])
      .flatMap(schemaToLookup)
      .filter(filterSensing);

    fs.writeFileSync(CACHE, JSON.stringify(value));
    console.warn(`writing new cache: ${CACHE}`)
    return value;
  }
}

/**
 * Get iterable of node types, suitable for concurrent testing
 */
export const getNodeTypes = (cache_hit?: boolean): NodeTypeTuple[] => {
  const counts = getNodes(cache_hit).reduce((acc: { [key: string]: number}, [label]: NodeTuple) => {
    return {
      ...acc,
      [label]: (acc[label]??0) + 1
    }
  }, {})
  return Object.entries(counts)
}

// Format the Authorization header, picking up from env var if undefined
export const Authorization = (
  username: string = process.env.SERVICE_ACCOUNT_USERNAME ?? "",
  password: string = process.env.SERVICE_ACCOUNT_PASSWORD ?? "",
  secret: string = process.env.SERVICE_ACCOUNT_SECRET ?? ""
) => [username, password, secret].join(":")

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
  const { token } = await response.json();
  expect(typeof token).toBe("string");
  expect(token).not.toBeFalsy();
  expect(token).not.toBe("undefined");
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
export const apiFetch = (url: string, method: string = "GET") => async (data?: Object) => {
  const token = await fetchToken();
  return fetch(`${API_PATH}/${url}`, {
    body: typeof data !== "undefined" ? JSON.stringify(data) : undefined,
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer:${token}`,
    },
  })
};
