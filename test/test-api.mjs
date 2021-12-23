import fetch from "node-fetch";
import assert from "assert";

// MERGE (n:Provider { apiKey: replace(apoc.create.uuid(), '-', ''), domain: 'oceanics.io' }) return n

const BASE_PATH = "http://localhost:8888/.netlify/functions";

describe("Auth API", function() {
  let TOKEN;
  const TEST_USER = "test@oceanics.io";
  const TEST_PASSWORD = "n0t_p@55w0rd";
  const TEST_SECRET = "salt";

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
      const response = await fetch(
        `${BASE_PATH}/auth`,
        {
          headers: {
            Authorization: [TEST_USER, TEST_PASSWORD, TEST_SECRET].join(":")
          }
        }
      );
      const data = await response.json()
      assert(!!data.token)
      console.log(data.token)
      TOKEN = data.token
    });

    xit("should deny access without credentials", function() {
      
    });
    xit("should deny access with wrong credentials", function() {
      
    });
  });
});

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
