import fetch from "node-fetch";
import assert from "assert";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

// const REAL_PATH = "http://localhost:8888/.netlify/functions";
const BASE_PATH = "http://localhost:8888/.netlify/functions";
const API_PATH = "http://localhost:8888/api"
const TEST_USER = "test@oceanics.io";
const TEST_PASSWORD = "n0t_p@55w0rd";
const TEST_SECRET = "salt";

const fetchToken = async () => {
  const response = await fetch(
    `${BASE_PATH}/auth`,
    {
      headers: {
        Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":")
      }
    }
  );
  return response.json()
}

describe("Auth API", function() {
  let TOKEN;

  const register = (apiKey) => {
    
    return fetch(
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
  )}

  describe("Teardown", function () {

    it("authenticates in existing graph", async function() {
      const data = await fetchToken()
      assert(typeof data.token !== "undefined")
      assert(!!data.token)
      TOKEN = data.token
    });

    it("clears non-provider, non-user nodes", async function () {
        const response = await fetch(
          `${API_PATH}/`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `bearer:${TOKEN}`
            }
          }
        )
        assert(response.status === 204, `Unexpected Status Code: ${response.status}`)
    })
  })
  
  describe("Register", function() {

    it("has valid API key in environment", function () {
      assert(typeof process.env.SERVICE_PROVIDER_API_KEY !== "undefined")
      assert(!!process.env.SERVICE_PROVIDER_API_KEY)
    })

    it("allows registration with API key", async function() {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY);
      assert(response.status === 200, `Unexpected Status Code: ${response.status}`);
    });

    it("should prevent registration without API key", async function() {
      const response = await register(undefined);
      assert(response.status === 403, `Unexpected Status Code: ${response.status}`);
    });

    it("should prevent registration with wrong API key", async function() {
      const response = await register("not-a-valid-api-key");
      assert(response.status === 403, `Unexpected Status Code: ${response.status}`);
    });

   
  });

  describe("Get JWT", function() {
    it("returns well-formed token given credentials", async function() {
      const data = await fetchToken()
      assert(typeof data.token !== "undefined")
      assert(!!data.token)
      TOKEN = data.token
    });

    xit("should deny access without credentials", function() {
      
    });
    xit("should deny access with wrong credentials", function() {
      
    });
  });

});

describe("SensorThings API", function () {
  let TOKEN = "";

  describe("Authenticate", function () {
    it("gets fresh access token", async function () {
      const data = await fetchToken()
      assert(typeof data.token !== "undefined")
      assert(!!data.token)
      TOKEN = data.token
    })
  })

  describe("Options", function () {
    it("reports for base path", async function () {

      const response = await fetch(
        `${API_PATH}/`,
        {
          method: "OPTIONS",
          headers: {
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      const statusError = response.status === 204;      
      assert(statusError, `Bad Status Code: ${response.status}`);
      const allowedMethods = response.headers.get("allow")
      const allowHeaderError = typeof allowedMethods !== "undefined";
      assert(allowHeaderError, "No Allow Header")
      assert(!!allowedMethods, "Bad Allow Header")
      assert(allowedMethods.split(",").length === 5, "Unexpected Number Of Allowed Methods")
    })

    it("reports for single node path", async function () {

      const response = await fetch(
        `${API_PATH}/Things`,
        {
          method: "OPTIONS",
          headers: {
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      const statusError = response.status === 204;      
      assert(statusError, `Bad Status Code: ${response.status}`);
      const allowedMethods = response.headers.get("allow")
      const allowHeaderError = typeof allowedMethods !== "undefined";
      assert(allowHeaderError, "No Allow Header")
      assert(!!allowedMethods, "Bad Allow Header")
      assert(allowedMethods.split(",").length === 5, "Unexpected Number Of Allowed Methods")
    })
  })
  
  describe("Create entities", function () {

    xit("creates a Thing", async function () {
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
      assert(response.status === 204)
    })

    it("retrieves collection index", async function () {
      const response = await fetch(
        `${API_PATH}/`, 
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer:${TOKEN}`
          }
        }
      )
      const data = await response.json();
      console.log(data)
    })

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
      const data = await response.json()
      assert(response.status === 200)
      console.log(data)
    })

    it("retrieves a single node by UUID", async function () {
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
      assert(response.status === 200)
      console.log(data)
    })
  })
})

describe("Lexicon API", function() {
  describe("Well Known Words", function () {
    it("works?", async function() {

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
      // const data = await response.json();
      // console.log("Error:", await response.text())
    });
  });
});
