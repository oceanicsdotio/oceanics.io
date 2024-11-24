// import { describe, expect, test, beforeAll } from '@jest/globals';
import examples from "./examples.json";

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
const types = (examples as unknown as [string]).reduce((acc: { [key: string]: number }, [label]) => {
  return {
    ...acc,
    [label]: (acc[label] ?? 0) + 1
  }
}, {})
nodeTypes = Object.entries(types);

/**
 * Use canonical test user information to get a Javascript Web Token.
 */
const fetchToken = async () => {
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

describe("functions", function () {
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

  describe("index", function () {
    const N_METHODS = 4;
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    // Show HTTP methods for this route
    describe("index.options", function () {
      test("options reports allowed methods", async function () {
        const response = await fetch(INDEX, {
          method: "OPTIONS",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });
        expect(response.status).toEqual(204);
        expect(response.headers.has("allow"));
        expect((response.headers.get("allow") || "").split(",")).toHaveLength(N_METHODS)
      });
    })
    // Create unique constraint if it does not exist
    describe("index.post", function () {
      // Do this for each type in the spec
      test.each(nodeTypes)("creates unique constraint for %s", async function (nodeType: string) {
        const response = await fetch(`${INDEX}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ label: nodeType })
        })
        expect(response.status).toEqual(204);
      });
    })
    // Get all labels in the graph as collection routes
    describe("index.get", function () {
      test("retrieves collection index", async function () {
        const response = await fetch(INDEX, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        })
        expect(response.status).toEqual(200);
        const data: any = await response.json();
        expect(data.length).toEqual(nodeTypes.length);
      });
    })
  })

  // Check collection handler
  describe("collection", function () {
    const N_METHODS = 3;
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    describe("collection.options", function () {
      const STATUS = 204;
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
        expect((response.headers.get("allow") || "").split(",").length).toBe(N_METHODS);
      });
      // But technically doesn't need to know node type
      // test("fails with bad request on missing left query parameter", async function () {
      //   const response = await fetch(`${COLLECTION}`, {
      //     method: "OPTIONS",
      //     headers: {
      //       "Authorization": `Bearer ${token}`
      //     },
      //   })
      //   expect(response.status).toEqual(400);
      // });
    });
    // Create unlinked single entities
    describe(`collection.post`, function () {
      // Delete all nodes owned by User
      beforeAll(async function () {
        return fetch(INDEX, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        })
      });
      // Create entities linked to the authenticated service account holder
      test.each(examples as [string, any, any][])(`creates %s %s`, async function (nodeType: string, _: string, properties: any) {
        const _filter = ([key]: [string, unknown]) => !key.includes("@");
        const filtered = Object.entries(properties).filter(_filter);
        const body = JSON.stringify(Object.fromEntries(filtered));
        const response = await fetch(`${COLLECTION}?left=${nodeType}`, {
          body,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        })
        expect(response.status).toEqual(204);
      });
      // Error handling case
      test("redirects unknown entity to 404", async function () {
        const response = await fetch(`${COLLECTION}?left=Nothings`, {
          body: JSON.stringify({ name: "Nothing" }),
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
      let PAGE_SIZE = 10;
      let token: string;
      beforeAll(async function () {
        token = await fetchToken();
      });
      // Retrieves expected collection, truncated by page max size
      test.each(nodeTypes)(`retrieves %s (N=%s)`, async function (nodeType: string, count: number) {
        expect(typeof count).toBe("number");
        const response = await fetch(`${COLLECTION}?left=${nodeType}&limit=${PAGE_SIZE}&offset=0`, {
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
        expect(actual).toEqual(data["value"].length);
        // May get back orphans or listed nodes from other services
        expect(actual).toBeGreaterThanOrEqual(Math.min(count, PAGE_SIZE));
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
      // Retrieves collection with paging
      test.each(nodeTypes)(`retrieves %s with paging (N=%s) `, async function (nodeType: string, count: number) {
        expect(typeof count).toBe("number");
        let offset = 0;
        let collected = [];
        let nextPage = `?offset=${offset}&limit=${PAGE_SIZE}`
        let previous = null;
        while (nextPage) {
          const url = `${COLLECTION}${nextPage}&left=${nodeType}`;
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
          expect(response.status).toBe(200);
          const data: any = await response.json();
          const actual = data["@iot.count"]
          expect(typeof actual).toBe("number");
          expect(actual).toBeGreaterThanOrEqual(1);
          const nodes = data["value"];
          expect(nodes.length).toEqual(actual);
          expect(typeof data.page.current).toBe("number");
          if (data.page.current > 1) {
            expect(data.page.previous.length).toBeGreaterThan(0)
          }
          collected.push(...nodes);
          nextPage = data.page.next ?? null;
        }
        expect(collected.length).toBeGreaterThanOrEqual(count);
      }, 10000);
    })
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
      expect((response.headers.get("allow") || "").split(",").length).toBe(4)
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

  // describe("entity.put", function () {
  //   let token: string;
  //   beforeAll(async function () {
  //     token = await fetchToken();
  //   });
  //   test.each(examples as unknown as [string, string][])(`mutate %s %s`, async function (nodeType: string, uuid: string) {
  //     const response = await fetch(`${ENTITY}?left=${nodeType}&left_uuid=${uuid}`, {
  //       method: "PUT",
  //       headers: {
  //         "Authorization": `Bearer ${token}`
  //       },
  //       body: JSON.stringify({
  //         name: "redacted"
  //       })
  //     })
  //     expect(response.status).toEqual(204);
  //   })
  // })

  describe("topology", function () {
    let linkedExamples: [string, string, string, string][] = [];
    (examples as any[]).forEach((each: any) => {
      const [left, left_uuid, props]: any = each;
      Object.entries(props).forEach(([key, value]) => {
        if (key.includes("@iot.navigation")) {
          let [right] = key.split("@");
          (value as any[]).forEach(({ name: [name] }) => {
            (examples as any[]).forEach((item) => {
              const [_right, right_uuid, _props]: any = item;
              const is_label_match = right === _right;
              const is_name_match = _props.name === name;
              if (is_label_match && is_name_match) {
                linkedExamples.push([left, left_uuid, right, right_uuid])
              }
            })
          })
        }
      })

      return Object.keys(props).some(key => key.includes("@iot.navigation"))
    })
    let token: string;
    beforeAll(async function () {
      token = await fetchToken();
    });
    // Confirm topology endpoint routing options
    describe("topology.options", function () {
      test("options reports allowed methods", async function () {
        const response = await fetch(`${TOPOLOGY}?left=Things&left_uuid=example&right=Sensors&right_uuid=example`, {
          method: "OPTIONS",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        })
        expect(response.status).toEqual(204);
        expect(response.headers.has("allow"));
        expect((response.headers.get("allow") || "").split(",").length).toBe(3)
      });
    });
    // Create relationships between nodes
    describe("topology.post", function () {
      // Create links from specification examples
      test.each(linkedExamples)(`join %s %s with %s %s`, async function (left: string, leftUuid: string, right: string, rightUuid: string) {
        const response = await fetch(
          `${TOPOLOGY}?left=${left}&left_uuid=${leftUuid}&right=${right}&right_uuid=${rightUuid}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
          }
        )
        expect(response.status).toEqual(204);
      });
    });

    describe("linked.get", function () {
      test.each(linkedExamples)(`query %s %s to %s %s`, async function (left: string, leftUuid: string, right: string, rightUuid: string) {
        // forward linking, back-linked doesn't necessarily work because there may be multiplicity 
        // in one direction or the other.
        const linkedResponse = await fetch(`${LINKED}?left=${left}&left_uuid=${leftUuid}&right=${right}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        expect(linkedResponse.status).toBe(200);
        const data: any = await linkedResponse.json();
        expect(data["@iot.count"]).toBe(1)
        expect(data["value"].length).toBe(1)
        expect(data["value"][0].uuid).toBe(rightUuid)
      })
    })
  })
})
