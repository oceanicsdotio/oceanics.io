import fetch from "node-fetch";
import YAML from "yaml";
import { readFileSync } from "fs";
import { describe, expect, test } from '@jest/globals'
import crypto from "crypto";
import { asNodes, filterBaseRoute, dematerialize, setupQueries } from "../shared/middleware";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

/**
 * Network configuration for tests.
 * - BASE: non-published routes
 * - API: routes described in our API documentation
 */
const HOSTNAME = "http://localhost:8888";
// const HOSTNAME = "https://www.oceanics.io";
const BASE_PATH = `${HOSTNAME}/.netlify/functions`;
const API_PATH = `${HOSTNAME}/api`;

// Auth header value
const SERVICE_ACCOUNT_AUTHENTICATION = [
  process.env.SERVICE_ACCOUNT_USERNAME??"", 
  process.env.SERVICE_ACCOUNT_PASSWORD??"", 
  process.env.SERVICE_ACCOUNT_SECRET??"",
].join(":")

// Lookup for entity type by domain area
const EXTENSIONS = {
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

/**
 * Use canonical test user information to get a Javascript Web Token.
 */
const fetchToken = async () => {
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

let spec;
const parseNodesFromApi = () => {
  const insertIds = (items) => {
    return items.map((props) => {
      return {
        ...props,
        uuid: crypto.randomUUID()
      }
    })
  }
  const text = readFileSync(
    "../bathysphere.yaml",
    "utf8"
  );
  spec = YAML.parse(text);
  
  const nodes = Object.entries(spec.components.schemas)
    //@ts-ignore
    .map(([key, value]) => [key, insertIds(value.examples ?? [])]);
  return Object.fromEntries(nodes);
}

const WELL_KNOWN_NODES = parseNodesFromApi();

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
 * Run setup of constraints on database
 */
describe("Database constraints", function () {
  /**
   * Add UUID index for each known type
   */
  test("dry run setup queries", async function() {
    setupQueries()
  })
})

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

    /**
     * Convenience method for submitting options query.
     */
    const options = (token, route = "") =>
      fetch(`${API_PATH}/${route}`, {
        method: "OPTIONS",
        headers: { Authorization: `bearer:${token}` },
      });

    /**
     * Options for path length zero
     */
    test("reports for base path", async function () {
      const token = await fetchToken();
      const response = await options(token);
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 2);
    });

    /**
     * Options for path length one
     */
    test("reports for single-node path", async function () {
      const token = await fetchToken();
      const response = await options(token, "Things");
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });

    /**
     * Options for topological paths
     */
    test.skip("reports for multi-node path", async function () {
      const token = await fetchToken();
      const response = await options(token, "Things/Locations");
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 4);
    });
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


  describe("Verify persisted data", function () {

    const CREATED_UUID = {};
    
  
    describe("Query nodes", function () {
      /**
       * We are able to get a single node by referencing it's unique
       * identifier. If it does not exist, or is not owned by the user,
       * then receive 404.
       */
      const validateByType = async (nodeType) => {
        const token = await fetchToken();
        const things = CREATED_UUID[nodeType]
        const result = things.map(async ({uuid})=> {
          const response = await fetch(
            `${API_PATH}/${nodeType}(${uuid})`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `bearer:${token}`,
              },
            }
          );
          const data = await response.json();
          expect(response.status).toEqual(200);
          expect(data.value.length).toBe(1)
          expect(uuid).toBe(data.value[0].uuid)
        })
        await Promise.all(result)
      }
  
      for (const nodeType of EXTENSIONS.sensing) {
        test(`retrieve ${nodeType} by UUID`, async function () {
          await validateByType(nodeType);
        }, 5000);
      }
    })
  })
  
});
