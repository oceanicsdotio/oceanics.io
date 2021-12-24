import fetch from "node-fetch";
import assert from "assert";
import yaml from "yaml";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

// const REAL_PATH = "http://localhost:8888/.netlify/functions";
const BASE_PATH = "http://localhost:8888/.netlify/functions";
const API_PATH = "http://localhost:8888/api"
const TEST_USER = "test@oceanics.io";
const TEST_PASSWORD = "n0t_p@55w0rd";
const TEST_SECRET = "salt";

/**
 * Use canonical test user information to get a Javascript Web Token.
 */
const fetchToken = () => fetch(
    `${BASE_PATH}/auth`,
    {
      headers: { Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":") }
    }
  ).then(response => response.json());

/**
 * Test the status code, just shorthand to avoid writing error messages
 */
const expect = (response, expectedStatus) => {
  assert(response.status === expectedStatus, `Unexpected Status Code: ${response.status}`)
}

/**
 * Stand alone tests for the Auth flow. Includes initial
 * teardown of test artifacts remaining in the graph.
 * 
 * On a clean database, the first test will fail. 
 */
describe("Auth API", function() {
  /**
   * Convenience method for creating consistent test user account under
   * multiple providers.
   */
  const register = (apiKey) => fetch(
    `${API_PATH}/auth`, 
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email: TEST_USER,
        password: TEST_PASSWORD,
        secret: TEST_SECRET,
        ...(typeof apiKey === "undefined" ? {} : {apiKey})
      })
    }
  )

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("Teardown", function () {
    /**
     * Remove User and and all linked, non-provider nodes. 
     */
    it("clears non-provider, nodes", async function () {
        const response = await fetch(
          `${API_PATH}/auth`,
          {
            method: "DELETE",
            headers: { Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":") }
          }
        )
        assert(response.status === 204, `Unexpected Status Code: ${response.status}`)
    })
  })
  
  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes. 
   */
  describe("Register", function() {
    /**
     * To create a User, you need to know at least one API key
     */
    it("has valid API key in environment", function () {
      assert(typeof process.env.SERVICE_PROVIDER_API_KEY !== "undefined")
      assert(!!process.env.SERVICE_PROVIDER_API_KEY)
    })

    /**
     * Valid API key will associate new User with an existing Provider
     */
    it("allows registration with API key", async function() {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY);
      expect(response, 200);
    });

    /**
     * Missing API key is a 403 error
     */
    it("should prevent registration without API key", async function() {
      const response = await register(undefined);
      expect(response, 403);
    });

    /**
     * Invalid API key is a 403 error
     */
    it("should prevent registration with wrong API key", async function() {
      const response = await register("not-a-valid-api-key");
      expect(response, 403);
    });
  });

  /**
   * Test Bearer Token based authentication
   */
  describe("Get JWT", function() {
    let TOKEN;
    /**
     * Memoize a valid Token
     */
    it("returns well-formed token given credentials", async function() {
      const data = await fetchToken()
      assert(typeof data.token !== "undefined")
      assert(!!data.token)
      TOKEN = data.token
    });

    /**
     * Missing header is a 403 error
     */
    it("denies access without credentials", async function() {
      const response = await fetch(`${BASE_PATH}/auth`);
      expect(response, 403)
    });

    /**
     * Bad credential is a 403 error
     */
    it("denies access with wrong credentials", async function() {
      const response = await fetch(
        `${BASE_PATH}/auth`,
        {
          headers: { 
            Authorization: [TEST_USER, "a-very-bad-password", TEST_SECRET].join(":") 
          }
        }
      );
      assert(response, 403)
    });
  });
});

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("SensorThings API Part 1", function () {
  let TOKEN;

  /**
   * 
   */
  describe("Authenticate", function () {
    it("gets fresh access token", async function () {
      const data = await fetchToken()
      assert(typeof data.token !== "undefined")
      assert(!!data.token)
      TOKEN = data.token
    })
  })

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
      const allowed = headers.get("allow")
      const methods = allowed.split(",")
      assert(typeof allowed !== "undefined", "No Allow Header")
      assert(!!allowed, "Empty Allow Header")
      assert(methods.length === expected, `Unexpected Number Of Allowed Methods (${methods.length}/${expected})`)
    }

    /**
     * Convenience method for submitting options query. 
     */
    const options = (route="") => fetch(
      `${API_PATH}/${route}`,
      {
        method: "OPTIONS",
        headers: { Authorization: `bearer:${TOKEN}` }
      }
    )

    /**
     * Options for path length zero
     */
    it("reports for base path", async function () {
      const response = await options();    
      expect(response, 204);
      testAllowedMethodCount(response.headers, 2)
    })

    /**
     * Options for path length one
     */
    it("reports for single-node path", async function () {
      const response = await options("Things");
      expect(response, 204);
      testAllowedMethodCount(response.headers, 5);
    })

    /**
     * Options for topological paths
     */
    it("reports for multi-node path", async function () {
      const response = await options("Things/Locations");
      expect(response, 204);
      testAllowedMethodCount(response.headers, 4);
    })
  })
  
  /**
   * Test entity creation and request validation by passing data
   * through the API and database and ensuring that it comes back
   * in expected format. 
   */
  describe("Create entities", function () {


    it("parses examples from API spec", function() {
      const spec = yaml.parse()
    })

    /**
     * Create a single Well-Known Entity node. 
     */
    it("creates a Thing", async function () {
      const response = await fetch(
        `${API_PATH}/Things`, 
        {
          body: JSON.stringify({name: "Lloigor"}),
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      expect(response, 204);
    })

    /**
     * Get the index of all node labels with API routes
     */
    xit("retrieves collection index", async function () {
      const response = await fetch(
        `${API_PATH}/`, 
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      expect(response, 200);
      // const data = await response.json();
    })

    /**
     * After the graph has been population there should be some number 
     * of each type of entity node. The number of nodes in the response
     * should be predicted from the the example nodes in the API spec. 
     */
    it("retrieves all nodes of a single type", async function () {
      const response = await fetch(
        `${API_PATH}/Things`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      // const data = await response.json()
      expect(response, 200);
      // const data = await response.json()
    })

    /**
     * We are able to get a single node by referencing it's unique
     * identifier. If it does not exist, or is not owned by the user,
     * then receive 404. 
     */
    xit("retrieves a single node by UUID", async function () {
      const response = await fetch(
        `${API_PATH}/Things(5e205dad8de845c89075c745e5235b05)`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      const data = await response.json()
      expect(response, 200);
    })
  })
})

/**
 * A stand-alone function for dictionary and aliasing
 * features
 */
describe("Lexicon API", function() {
  /**
   * Test correcting input word to the closest 
   * well-known match.
   */
  describe("Well Known Words", function () {
    /**
     * Dummy function works but is not fully implemented
     */
    xit("works?", async function() {
      const response = await fetch(
        `${BASE_PATH}/lexicon`, 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            pattern: "lexicon",
            maxCost: 1
          })
        }
      )
      assert(response.status === 200)
    });
  });
});
