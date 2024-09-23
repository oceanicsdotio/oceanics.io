// import { describe, expect, test, beforeAll } from '@jest/globals';
import examples from "./examples.json";

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
    beforeAll(async function () {
      token = await fetchToken();
    });
    test.each(nodeTypes)("reports allowed methods for %s", async function (nodeType: string) {
      const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })
      expect(response.status).toEqual(204);
      expect(response.headers.has("allow"));
      expect((response.headers.get("allow")||"").split(",").length).toBe(3);
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
      expect(count).toEqual(actual);
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
    })
  })
})
