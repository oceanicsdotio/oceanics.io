// import { describe, expect, test, beforeAll } from '@jest/globals';
import examples from "./examples.json";
import specification from "./specification.json";
import yaml from "yaml";
import fs from "fs";

const BASE_URL = "http://localhost:8888";
const IDENTITY = "https://www.oceanics.io/.netlify/identity";
const FUNCTIONS = `${BASE_URL}/.netlify/functions`;
const INDEX = `${FUNCTIONS}/index`;
const COLLECTION = `${FUNCTIONS}/collection`;
const TOPOLOGY = `${FUNCTIONS}/topology`;
const ENTITY = `${FUNCTIONS}/entity`;
const LINKED = `${FUNCTIONS}/linked`;

/**
 * Get iterable of node types, suitable for concurrent testing
 */
let nodeTypes: [string, number][] = [];
const types = (examples as unknown as [string]).reduce((acc: { [key: string]: number}, [label]) => {
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

  const result: any = await response.json();
  if (!response.ok) {
    console.log("fetch result", result)
  }
  return result.access_token;
}

describe("idempotent", function () {
  describe("identity", function () {
    describe("token.get", function () {
      test.each([
        ["SERVICE_ACCOUNT_USERNAME"],
        ["SERVICE_ACCOUNT_PASSWORD"]
      ])(`%s is in environment`, async function (key: string) {
        const value = process.env[key];
        expect(typeof value).toBe("string");
        expect(value).not.toBeFalsy();
      });

      test("use basic auth to get a JWT", async function () {
        const username = process.env.SERVICE_ACCOUNT_USERNAME;
        const password = process.env.SERVICE_ACCOUNT_PASSWORD;
        const response = await fetch(`${IDENTITY}/token`, {
          method: "POST",
          body: `grant_type=password&username=${username}&password=${password}`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        })
        const result: any = await response.json();
        expect(result.access_token.length).toBeGreaterThan(0);
      })
    })
    
    describe("user.get", function () {
      test("fetch user data", async function () {
        const response = await fetch(`${IDENTITY}/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await fetchToken()}`
          }
        });
        expect(response.status).toBe(200);
        const user = await response.json();
        expect(typeof user.email).toEqual("string");
      })
    })
  })

  // Show HTTP methods for this route
  describe("index.options", function () {
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    
    test("options reports allowed methods", async function () {
      const response = await fetch(INDEX, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",")).toHaveLength(3)
    });
  })

  // Get all labels in the graph as collection routes
  describe("index.get", function () {
    test("retrieves collection index", async function () {
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
    let token: string;
    const N_METHODS = 3;
    const STATUS = 204;
    beforeAll(async function () {
      token = await fetchToken();
    });
    // Recognizes valid node types, to support type specific methods
    test.each(nodeTypes)("reports allowed methods for %s", async function (nodeType: string) {
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(STATUS);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(N_METHODS);
    });
    // But technically doesn't need to know node type
    test("does not require left query parameter", async function () {
      const response = await fetch(`${COLLECTION}`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(STATUS);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(N_METHODS);
    });
    // Should fail without user in context (n)
    test("fails on missing auth header", async function () {
      const response = await fetch(`${COLLECTION}`, {
        method: "OPTIONS",
      })
      expect(response.status).toEqual(403);
    });
  });

  // Create unlinked single entities
  describe(`collection.post`, function () {
    let token: string;
    // Delete all nodes owned by User
    beforeAll(async function () {
      token = await fetchToken();
      return fetch(INDEX, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })
    });

    test.each(examples as [string, any, any][])(`creates %s %s`, async function (nodeType: string, _: string, properties: any) {
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        body: JSON.stringify(properties),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(204);
    });

    test("redirects unknown entity to 404", async function () {
      const response = await fetch(`${COLLECTION}?left=Nothings`, {
        body: JSON.stringify({name: "Nothing"}),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(404);
    })
  });

  // Confirm that we can retrieve the pre-computed Nodes
  describe("collection.get", function () {
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    // Retrieves expected collection, truncated by page max size
    test.each(nodeTypes)(`retrieves %s (N=%s)`, async function (nodeType: string, count: number) {
      expect(typeof count).toBe("number");
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      expect(response.status).toBe(200);
      const data: any = await response.json();
      const actual = data["@iot.count"]
      expect(typeof actual).toBe("number");
      expect(actual).toBeGreaterThanOrEqual(0);
      expect(data["value"].length).toEqual(actual);
      expect(Math.min(count, 100)).toEqual(actual);
    });
    // Test missing required query string parameters
    test(`fails without node type`, async function () {
      const response = await fetch(`${COLLECTION}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      expect(response.status).toBe(400);
    });
    // Retrieves collection with
    test.each(nodeTypes)(`retrieves %s (N=%s) with paging`, async function (nodeType: string, count: number) {
      expect(typeof count).toBe("number");
      let offset = 0;
      let collected = [];
      const limit = 4;
      while (offset < count) {
        const response = await fetch(`${COLLECTION}?left=${nodeType}&offset=${offset}&limit=${limit}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        expect(response.status).toBe(200);
        const data: any = await response.json();
        const actual = data["@iot.count"]
        expect(typeof actual).toBe("number");
        expect(actual).toBeGreaterThanOrEqual(0);
        expect(data["value"].length).toEqual(actual);
        collected.push(data["value"])
        offset += actual
      }
      expect(count).toEqual(collected.length);
    });
  })

  // Confirm entity endpoint routing options
  describe("entity.options", function () {
    test("options reports allowed methods", async function () {
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
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    test.each(examples as unknown as [string, string][])(`verify %s %s`, async function (nodeType: string, uuid: string) {
      const response = await fetch(`${ENTITY}?left=${nodeType}&left_uuid=${uuid}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(200);
      const data: any = await response.json();
      expect(data["@iot.count"]).toBe(1)
      expect(data["value"].length).toBe(1)
      expect(data["value"][0].uuid).toBe(uuid)
    })
  })

  // Confirm topology endpoint routing options
  describe("topology.options", function () {
    test("options reports allowed methods", async function () {
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
      const left: any = await things.json();
      const locations = await fetch(`${COLLECTION}?left=Locations`, {
        method: "GET",
        headers: _headers,
      })
      const right: any = await locations.json();
      console.log({
        left: left.value[0],
        right: right.value[0]
      })
      const response = await fetch(
        `${TOPOLOGY}?left=Things&left_uuid=${left.value[0].uuid}&right=Locations&right_uuid=${right.value[0].uuid}`,
        {
          method: "POST",
          headers: _headers,
          body: JSON.stringify({})
        }
      )
      expect(response.status).toEqual(204);

      // Test generic back linking - need to move this to another describe block
      const linkedResponse = await fetch(`${LINKED}?left=Locations&left_uuid=${right.value[0].uuid}&right=Things`, {
        method: "GET",
        headers: _headers
      })
      expect(linkedResponse.status).toBe(200);
      const data: any = await linkedResponse.json();
      console.log(JSON.stringify(data, undefined, 2))
      expect(data["@iot.count"]).toBe(1)
      expect(data["value"].length).toBe(1)
      expect(data["value"][0].uuid).toBe(left.value[0].uuid)
    })
  })
})

describe("canonical data sources", function () {
  let sources: any;
  beforeAll(function () {
    const contents = fs.readFileSync("locations.yml", "utf-8");
    const {geojson} = yaml.parse(contents);
    sources = geojson
  })

  describe("aquaculture", function() {
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });

    test("aquaculture leases", async function () {
      const [leases] = sources.filter((each: any) => each.id === "aquaculture-leases-direct")
      const response = await fetch(leases.url);
      const parsed = await response.json()
      expect(parsed.type === "FeatureCollection")
      expect(parsed.features.length > 0)
    })

    test("limited purpose aquaculture licenses", async function () {

      const [licenses] = sources.filter((each: any) => each.id === "limited-purpose-licenses")
      const response = await fetch(licenses.url);
      const parsed = await response.json()
      expect(parsed.type === "FeatureCollection")
      expect(parsed.features.length > 0)

    })
  })
})
