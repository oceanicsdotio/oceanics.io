import fetch from "node-fetch";
import assert from "assert";
import YAML from "yaml";
import { readFileSync } from "fs";
import { describe, it } from "mocha";
import crypto from "crypto";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

const BASE_PATH = "http://localhost:8888/.netlify/functions";
const API_PATH = "http://localhost:8888/api";
const TEST_USER = "test@oceanics.io";
const TEST_PASSWORD = "n0t_p@55w0rd";
const TEST_SECRET = "salt";
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
const fetchToken = () =>
  fetch(`${BASE_PATH}/auth`, {
    headers: {
      Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":"),
    },
  }).then((response) => response.json());

/**
 * Test the status code, just shorthand to avoid writing error messages
 */
const expect = (response, expectedStatus) => {
  assert(
    response.status === expectedStatus,
    `Unexpected Status Code: ${response.status}`
  );
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
  const { token } = await fetchToken();
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
    "oceanics-io-www/public/bathysphere.yaml",
    "utf8"
  );
  spec = YAML.parse(text);
  const nodes = Object.entries(spec.components.schemas)
    .map(([key, value]) => [key, insertIds(value.examples ?? [])]);
  return Object.fromEntries(nodes);
}

const WELL_KNOWN_NODES = parseNodesFromApi();

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
      
      assert(response.status === 200, `Unexpected Response Code: ${response.status}`);

      const pass = result.test === expected;
      if (!pass) console.log({...data, ...result});
      assert(pass, `Unexpected Validation Result`);
    }

    /**
     * Block of `it` scope tests that check that the validation service is
     * maintaining the integrity constraints identified in the specification.
     */
    const validateInterface = (nodeType) => {
      return function () {

        const reference = `#/components/schemas/${nodeType}`;
        const testCase = WELL_KNOWN_NODES[nodeType][0];
        const {required=[], additionalProperties=true} = spec.components.schemas[nodeType];
  
        it("validates well known nodes", async function () {
          for (const data of WELL_KNOWN_NODES[nodeType]) {
            await testResponse({ data, reference}, true);
          }
        })
  
        for (const key of required) {
          it(`fails without ${key}`, async function () {
            await testResponse({ data: {
              ...testCase,
              [key]: undefined
            }, reference }, false);
          })
        }
        if (!additionalProperties) {
          it("fails with additional properties", async function () {
            await testResponse({ data: {
              ...testCase,
              extra: "extra-key-value-pair"
            }, reference }, false);
          })
        }
      }
    }

    /**
     * Create a `describe` block for each of the Sensing API entities
     */
    for (const nodeType of EXTENSIONS.sensing) {
      describe(nodeType, validateInterface(nodeType));
    }

        /**
     * Create a `describe` block for each of the Sensing API entities
     */
    for (const nodeType of EXTENSIONS.sensing) {
      describe(nodeType, validateInterface(nodeType));
    }
})

/**
 * Stand alone tests for the Auth flow. Includes initial
 * teardown of test artifacts remaining in the graph.
 *
 * On a clean database, the first test will fail.
 */
describe("Auth API", function () {
  /**
   * Convenience method for creating consistent test user account under
   * multiple providers.
   */
  const register = (apiKey) =>
    fetch(`${API_PATH}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER,
        password: TEST_PASSWORD,
        secret: TEST_SECRET,
        ...(typeof apiKey === "undefined" ? {} : { apiKey }),
      }),
    });

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("Teardown", function () {
    /**
     * Remove User and and all linked, non-provider nodes.
     */
    it("clears non-provider, nodes", async function () {
      const response = await fetch(`${API_PATH}/auth`, {
        method: "DELETE",
        headers: {
          Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":"),
        },
      });
      assert(
        response.status === 204,
        `Unexpected Status Code: ${response.status}`
      );
    });
  });

  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes.
   */
  describe("Register", function () {
    /**
     * To create a User, you need to know at least one API key
     */
    it("has valid API key in environment", function () {
      assert(typeof process.env.SERVICE_PROVIDER_API_KEY !== "undefined");
      assert(!!process.env.SERVICE_PROVIDER_API_KEY);
    });

    /**
     * Valid API key will associate new User with an existing Provider
     */
    it("allows registration with API key", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response, 200);
    });

    /**
     * Missing API key is a 403 error
     */
    it("should prevent registration without API key", async function () {
      //@ts-ignore
      const response = await register(undefined);
      expect(response, 403);
    });

    /**
     * Invalid API key is a 403 error
     */
    it("should prevent registration with wrong API key", async function () {
      const response = await register("not-a-valid-api-key");
      expect(response, 403);
    });
  });

  /**
   * Test Bearer Token based authentication
   */
  describe("JWT Auth", function () {
    /**
     * Memoize a valid Token
     */
    it("returns well-formed token given credentials", async function () {
      const data = await fetchToken();
      assert(typeof data.token !== "undefined");
      assert(!!data.token);
    });

    /**
     * Missing header is a 403 error
     */
    it("denies access without credentials", async function () {
      const response = await fetch(`${BASE_PATH}/auth`);
      expect(response, 403);
    });

    /**
     * Bad credential is a 403 error
     */
    it("denies access with wrong credentials", async function () {
      const response = await fetch(`${BASE_PATH}/auth`, {
        headers: {
          Authorization: [TEST_USER, "a-very-bad-password", TEST_SECRET].join(
            ":"
          ),
        },
      });
      expect(response, 403);
    });
  });
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
      assert(typeof allowed !== "undefined", "No Allow Header");
      assert(!!allowed, "Empty Allow Header");
      assert(
        methods.length === expected,
        `Unexpected Number Of Allowed Methods (${methods.length}/${expected})`
      );
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
    it("reports for base path", async function () {
      const { token } = await fetchToken();
      const response = await options(token);
      expect(response, 204);
      testAllowedMethodCount(response.headers, 2);
    });

    /**
     * Options for path length one
     */
    it("reports for single-node path", async function () {
      const { token } = await fetchToken();
      const response = await options(token, "Things");
      expect(response, 204);
      testAllowedMethodCount(response.headers, 5);
    });

    /**
     * Options for topological paths
     */
    it("reports for multi-node path", async function () {
      const { token } = await fetchToken();
      const response = await options(token, "Things/Locations");
      expect(response, 204);
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
      assert(responses.length >= 1, `Unexpected Number of Responses: (${responses.length}/N)`);
      responses.forEach(({ value: response }) => {
        expect(response, 204);
      });
    };

    /**
     * Create a single Well-Known Entity node.
     */
    for (const nodeType of EXTENSIONS.sensing) {
      it(`creates ${nodeType}`, async function () {
        await validateBatch(
          batch(composeWriteTransaction, nodeType, WELL_KNOWN_NODES[nodeType])
        );
      });
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

  describe("Verify persisted data", function () {

    const CREATED_UUID = {};
    
    describe("Query index", function () {
      /**
         * Get the index of all node labels with API routes
         */
      it("retrieves collection index", async function () {
        const { token } = await fetchToken();
        const response = await fetch(`${API_PATH}/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `bearer:${token}`,
          },
        });
        expect(response, 200);
        const data = await response.json();
        assert(data.length >= 1, `Expected one or more nodes in result`);
        const names = new Set(data.map((item) => item.name));
        assert(
          EXTENSIONS.auth.every((omit) => !names.has(omit)),
          `Result Contains Private Type`
        );
      });
    })
  
    describe("Query collection", function() {
      /**
       * After the graph has been population there should be some number
       * of each type of entity node. The number of nodes in the response
       * should be predicted from the the example nodes in the API spec.
       */
      for (const nodeType of EXTENSIONS.sensing) {
        it(`retrieves index of ${nodeType}`, async function () {
          const {token} = await fetchToken();
          const data = await readTransaction(token)(nodeType);
          const actual = data["@iot.count"];
          const expected = WELL_KNOWN_NODES[nodeType].length;
          assert(
            expected === actual, 
            `Unexpected Array Size for ${nodeType} (${actual}/${expected})`
          );
          CREATED_UUID[nodeType] = data.value;
        });
      }
    });
  
    describe("Query nodes", function () {
      /**
       * We are able to get a single node by referencing it's unique
       * identifier. If it does not exist, or is not owned by the user,
       * then receive 404.
       */
      const validateByType = async (nodeType) => {
        const { token } = await fetchToken();
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
          expect(response, 200);
          assert(data.value.length === 1)
          assert(uuid === data.value[0].uuid)
        })
        await Promise.all(result)
      }
  
      for (const nodeType of EXTENSIONS.sensing) {
        it(`retrieve ${nodeType} by UUID`, async function () {
          await validateByType(nodeType);
        });
      }
    })
  })
  

  describe("Join Nodes", function() {
    this.timeout(5000)
    it("joins two well-known nodes",  async function() {
      const {token} = await fetchToken();
      const read = readTransaction(token);
      const things = await read("Things");
      const locations = await read("Locations");
      const queryData = {
        Things: things.value[0].uuid,
        Locations: locations.value[0].uuid,
      }
      const response = await fetch(
        `${API_PATH}/Things(${queryData.Things})/Locations(${queryData.Locations})`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `bearer:${token}`,
          },
          body: JSON.stringify({})
        }
      )
      expect(response, 204);
    })
  })
});

/**
 * A stand-alone function for dictionary and aliasing
 * features
 */
describe("Lexicon API", function () {
  /**
   * Test correcting input word to the closest
   * well-known match.
   */
  describe("Well Known Words", function () {
    /**
     * Dummy function works but is not fully implemented
     */
    xit("works?", async function () {
      const response = await fetch(`${BASE_PATH}/lexicon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pattern: "lexicon",
          maxCost: 1,
        }),
      });
      assert(response.status === 200);
    });
  });
});
