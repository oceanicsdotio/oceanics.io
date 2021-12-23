import fetch from "node-fetch";
import assert from "assert";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

// const REAL_PATH = "http://localhost:8888/.netlify/functions";
const BASE_PATH = "http://localhost:8888/.netlify/functions";
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
  
  describe("Register", function() {

    it("has valid API key in environment", function () {
      assert(typeof process.env.SERVICE_PROVIDER_API_KEY !== "undefined")
      assert(!!process.env.SERVICE_PROVIDER_API_KEY)
    })

    it("allows registration with API key", async function() {
      const response = await fetch(
        `${BASE_PATH}/auth`, 
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            email: TEST_USER,
            password: TEST_PASSWORD,
            secret: TEST_SECRET,
            apiKey: process.env.SERVICE_PROVIDER_API_KEY
          })
        }
      )
      assert(response.status === 200)
    });

    xit("should prevent registration without API key", function() {
      
    });

    xit("should prevent registration with wrong API key", function() {
      
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
    it("reports options", async function () {

      const response = await fetch(
        `${BASE_PATH}/sensor-things`,
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
        `${BASE_PATH}/sensor-things/?node=Things`, 
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
        `${BASE_PATH}/sensor-things`, 
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
        `${BASE_PATH}/sensor-things?node=Things`,
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
        `${BASE_PATH}/sensor-things?node=Things(5e205dad8de845c89075c745e5235b05)`,
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
