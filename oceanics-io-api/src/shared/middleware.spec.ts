import fetch from "node-fetch";
import YAML from "yaml";
import { readFileSync } from "fs";
import { describe, expect, test } from '@jest/globals'
import crypto from "crypto";
import { asNodes, filterBaseRoute, dematerialize, setupQueries } from "../shared/middleware";
import spec from "./bathysphere.json";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

/**
 * Network configuration for tests.
 * - BASE: non-published routes
 * - API: routes described in our API documentation
 */
const HOSTNAME = "http://localhost:8888";
// const HOSTNAME = "https://www.oceanics.io";
export const BASE_PATH = `${HOSTNAME}/.netlify/functions`;
export const API_PATH = `${HOSTNAME}/api`;

// Auth header value
const SERVICE_ACCOUNT_AUTHENTICATION = [
  process.env.SERVICE_ACCOUNT_USERNAME??"", 
  process.env.SERVICE_ACCOUNT_PASSWORD??"", 
  process.env.SERVICE_ACCOUNT_SECRET??"",
].join(":")

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


const insertId = (props: Object) => Object({ ...props, uuid: crypto.randomUUID() });
const specifyExamples = ([key, {examples=[]}]: [string, any]) => [key, examples.map(insertId)];

const parseNodesFromApi = () => {
  const nodes = Object.entries(spec.components.schemas).map(specifyExamples);
  return Object.fromEntries(nodes);
}

export const WELL_KNOWN_NODES = parseNodesFromApi();

    /**
     * Parse and check the number of methods in the Allow header.
     * Does not check that the values are correct, only that the number of
     * them is what is expected.
     */
     export const testAllowedMethodCount = (headers, expected) => {
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
      Authorization: SERVICE_ACCOUNT_AUTHENTICATION,
    },
  })
  expect(response.status).toBe(200);
  //@ts-ignore
  const { token } = response.json();
  return token;
}

export const readTransaction = (token: string) => async (nodeType: string) => {
    return fetch(`${API_PATH}/${nodeType}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer:${token}`,
      },
    }).then(response => response.json());
};

/**
 * Returns transaction promise function
 */
const composeWriteTransaction = (token, url) => (data) => {
  return fetch(url, {
    body: JSON.stringify(data),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer:${token}`,
    },
  });
};

/**
 * Execute many requests against a single endpoint, in this case
 * stripping out any topological metadata.
 * 
 * This is specific to creating sensor things style nodes,
 * but is purposefully generic so maybe can be brought into
 * main API
 */
const batch = async (composeTransaction, nodeType, data) => {
  const token = await fetchToken();
  const job = composeTransaction(token, `${API_PATH}/${nodeType}`);
  const queue = data.map((each) =>
    Object.fromEntries(
      Object.entries(each).filter(([key]) => !key.includes("@"))
    )
  );
  return Promise.allSettled(queue.map(job));
};


describe("Middleware", function () {

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
    const nodeTransform = asNodes("POST", JSON.stringify({uuid}));
    const segments = path.split("/").filter(filterBaseRoute)
    const node = nodeTransform(segments[0], 0);
    expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
  })
})

/**
 * API request validation is through a separate service so that it can be tested
 * and used without needing to persist data or manage side effects. 
 * 
 * This `describe` block checks that all canonical examples we use in tests and code
 * are valid, and that the API layer contract is being upheld on both sides. If the docs
 * fall out of date with the schema, these tests will start failing. 
 */
describe("API Request Validator", function () {

  const query = (body) => fetch(`${BASE_PATH}/api-validator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const testResponse = async (data, expected) => {
    const response = await query(data);
    const result = await response.json();
    
    expect(response.status).toBe(200);

    const pass = result.test === expected;
    if (!pass) console.log({...data, ...result});
    expect(pass).toBe(true);
  }

  /**
   * Block of `test` scope tests that check that the validation service is
   * maintaining the integrity constraints identified in the specification.
   */
  const validateInterface = (nodeType) => {
    return function () {

      const reference = `#/components/schemas/${nodeType}`;
      const testCase = WELL_KNOWN_NODES[nodeType][0];
      const {required=[], additionalProperties=true} = spec.components.schemas[nodeType];

      test("validates well known nodes", async function () {
        for (const data of WELL_KNOWN_NODES[nodeType]) {
          await testResponse({ data, reference}, true);
        }
      }, 4000)

      for (const key of required) {
        test(`fails without ${key}`, async function () {
          await testResponse({ data: {
            ...testCase,
            [key]: undefined
          }, reference }, false);
        }, 4000)
      }
      if (!additionalProperties) {
        test("fails with additional properties", async function () {
          await testResponse({ data: {
            ...testCase,
            extra: "extra-key-value-pair"
          }, reference }, false);
        }, 4000)
      }
    }
  }

  /**
   * Create a `describe` block for each of the Sensing API entities
   */
  for (const nodeType of EXTENSIONS.sensing) {
    describe(nodeType, validateInterface(nodeType));
  }
})

    /**
     * Convenience method for submitting options query.
     */
     export const options = (token, route = "") =>
     fetch(`${API_PATH}/${route}`, {
       method: "OPTIONS",
       headers: { Authorization: `bearer:${token}` },
     });

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("Sensing API", function () {

  /**
   * Check options on for each number of path segments.
   *
   * The SensorThings standard specifies that the path can be
   * arbitrarily long. However, not all operations make sense
   * for linked nodes, so the API matches against the combination
   * of method and path length.
   */
  describe("Options", function () {
    /**
     * Parse and check the number of methods in the Allow header.
     * Does not check that the values are correct, only that the number of
     * them is what is expected.
     */
    const testAllowedMethodCount = (headers, expected) => {
      const allowed = headers.get("allow");
      const methods = (allowed||"").split(",");
      expect(typeof allowed).not.toBe("undefined");
      expect(allowed).not.toBeFalsy();
      expect(methods.length).toBe(expected)
    };



  });

  /**
   * Test entity creation and request validation by passing data
   * through the API and database and ensuring that it comes back
   * in expected format.
   */
  describe("Create nodes", function () {

    const validateBatch = async (batchPromises) => {
      const responses = await batchPromises;
      expect(responses.length).toBeGreaterThanOrEqual(1)
      responses.forEach(({ value: response }) => {
        expect(response.status).toEqual(204);
      });
    };

    /**
     * Create a single Well-Known Entity node.
     */
    for (const nodeType of EXTENSIONS.sensing) {
      test(`creates ${nodeType}`, async function () {
        await validateBatch(
          batch(composeWriteTransaction, nodeType, WELL_KNOWN_NODES[nodeType])
        );
      }, 5000);
    }
  });

  const readTransaction = (token) => async (nodeType) => {
    return fetch(`${API_PATH}/${nodeType}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer:${token}`,
      },
    }).then(response => response.json());
  };

});
