import { describe, expect, test, beforeAll } from '@jest/globals';
import fetch from "node-fetch";
import nodes from "./cache.json";

const IDENTITY = "https://www.oceanics.io/.netlify/identity";
const FUNCTIONS = "http://localhost:8888/.netlify/functions";
const INDEX = `${FUNCTIONS}/index`;
const COLLECTION = `${FUNCTIONS}/collection`;
const TOPOLOGY = `${FUNCTIONS}/topology`;
const ENTITY = `${FUNCTIONS}/entity`;

/**
 * Get iterable of node types, suitable for concurrent testing
 */
let nodeTypes: [string, number][] = [];
const types = (nodes as unknown as [string]).reduce((acc: { [key: string]: number}, [label]) => {
  return {
    ...acc,
    [label]: (acc[label] ?? 0) + 1
  }
}, {})
nodeTypes = Object.entries(types);


/**
 * Use canonical test user information to get a Javascript Web Token.
 */
export const fetchToken = async () => {
  const username = process.env.SERVICE_ACCOUNT_USERNAME;
  const password = process.env.SERVICE_ACCOUNT_PASSWORD;
  const response = await fetch(`${IDENTITY}/token`, {
    method: "POST",
    body: `grant_type=password&username=${username}&password=${password}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })
  const { access_token }: any = await response.json();
  return access_token;
}

describe("idempotent", function () {
  describe("identity", function () {
    describe("token.get", function () {
      test.concurrent.each([
        ["SERVICE_ACCOUNT_USERNAME"],
        ["SERVICE_ACCOUNT_PASSWORD"]
      ])(`%s is in environment`, async function (key: string) {
        const value = process.env[key];
        expect(typeof value).toBe("string");
        expect(value).not.toBeFalsy();
      });

      test.concurrent("use basic auth to get a JWT", async function () {
        const token = await fetchToken();
        expect(token.length).toBeGreaterThan(0);
      })
    })
    
    describe("user.get", function () {
      test.concurrent("fetch user data", async function () {
        const response = await fetch(`${IDENTITY}/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await fetchToken()}`
          }
        });
        expect(response.status).toBe(200);
        const user = await response.json();
        expect(user.email).toBeInstanceOf(String);
      })
    })
  })

  // Show HTTP methods for this route
  describe("index.options", function () {
    test.concurrent("options reports allowed methods", async function () {
      const response = await fetch(INDEX, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      });
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",")).toHaveLength(3)
    });
  })

  // Get all labels in the graph as collection routes
  describe("index.get", function () {
    test.concurrent("retrieves collection index", async function () {
      const response = await fetch(INDEX, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(200);
      const data: any = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(0);
    });
  })

  // Check collection routing options
  describe("collection.options", function () {
    test.concurrent.each(nodeTypes)("reports allowed methods for %s", async function (nodeType) {
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(3);
    });
  });

  // Create unlinked single entities
  describe(`collection.post`, function () {

    // Delete all nodes owned by User
    beforeAll(async function () {
      const response = await fetch(INDEX, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toBe(204);
    });

    test.concurrent.each(nodes as [string, any, any][])(`creates %s %s`, async function (nodeType, _, properties) {
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        body: JSON.stringify(properties),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(204);
    });

    test.concurrent("redirects unknown entity to 404", async function () {
      const response = await fetch(`${COLLECTION}?left=Nothings`, {
        body: JSON.stringify({name: "Nothing"}),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(404);
    })
  });

  // Confirm that we can retrieve the pre-computed Nodes
  describe("collection.get", function () {
    test.concurrent.each(nodeTypes)(`retrieves %s (N=%s)`, async function (nodeType, count) {
      expect(typeof count).toBe("number");
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        }
      })
      expect(response.status).toBe(200);
      const data: any = await response.json();
      const actual = data["@iot.count"]
      expect(typeof actual).toBe("number");
      expect(actual).toBeGreaterThanOrEqual(0);
      expect(data["value"].length).toEqual(actual);
    });
  })

  // Confirm entity endpoint routing options
  describe("entity.options", function () {
    test.concurrent("options reports allowed methods", async function () {
      const response = await fetch(`${ENTITY}?left=Things&left_uuid=example`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(3)
    });
  });

  // Get a single entity by referencing UUID
  describe("entity.get", function () {
    test.concurrent.each(nodes as unknown as [string, string][])(`verify %s %s`, async function (nodeType: string, uuid: string) {
      const response = await fetch(`${ENTITY}?left=${nodeType}&left_uuid=${uuid}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(200);
      const data: any = await response.json();
      console.log(data)
      console.log(JSON.parse(data["value"]));
      expect(data["@iot.count"]).toBe(1)
      expect(data["value"].length).toBe(1)
      expect(data["value"][0].uuid).toBe(uuid)
    })
  })

  // Confirm topology endpoint routing options
  describe("topology.options", function () {
    test.concurrent("options reports allowed methods", async function () {
      const response = await fetch(`${TOPOLOGY}?left=Things&left_uuid=example&right=Sensors&right_uuid=example`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${await fetchToken()}`
        },
      })
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(3)
    });
  });

  // Create relationships between nodes
  describe("topology.post", function() {
    test("join two well-known nodes",  async function() {
      const _headers = {
        "Authorization": `Bearer ${await fetchToken()}`
      };
      const things = await fetch(`${COLLECTION}?left=Things`, {
        method: "GET",
        headers: _headers,
      })
      const {value: [{uuid: thingsId}]}: any = await things.json();
      const locations = await fetch(`${COLLECTION}?left=Locations`, {
        method: "GET",
        headers: _headers,
      })
      const {value: [{uuid: locationsId}]}: any = await locations.json();
      const queryData = {
        Things: thingsId,
        Locations: locationsId,
      }
      const response = await fetch(
        `${TOPOLOGY}?left=Things&left_uuid=${queryData.Things}&right=Locations&right_uuid=${queryData.Locations}`,
        {
          method: "POST",
          headers: _headers,
          body: JSON.stringify({})
        }
      )
      expect(response.status).toEqual(204);
    })
  })
})
