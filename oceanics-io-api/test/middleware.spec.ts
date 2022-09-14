import { describe, expect, test, beforeAll } from '@jest/globals';
import { 
  Node,
  Context,
  Request,
  Constraint, 
  Cypher,
  RequestHeaders,
  Links, 
  panic_hook, 
  Specification
} from "oceanics-io-api-wasm";


const THINGS = "Things";

const expectError = (node: Node, method: string, ...args: unknown[]) => {
  let error = null;
  let query = null;
  try {
    query = node[method](...args)
  } catch (_error) {
    error = _error.message;
  }
  expect(query).toBe(null)
  expect(error).not.toBeFalsy()
}

beforeAll(panic_hook)

describe("idempotent", function() {

  describe("wasm middleware", function() {
    // describe("LogLine", function() {
    //   test.concurrent("constructs LogLine", async function () {
    //     const detail = new LogLine({
    //       user: "user@example.com",
    //       httpMethod: "GET",
    //       statusCode: 403,
    //       elapsedTime: 1.0,
    //       auth: "BearerAuth"
    //     });
    //     expect(detail).not.toBeFalsy();
    //   })
    // })  

    // describe("Handler", function() {
    //   test.concurrent("constructs Handler", async function () {
    //     const handler = new Handler({
    //       security: [{
    //         bearerAuth: []
    //       }]
    //     });
    //     expect(handler).not.toBeFalsy();
    //     expect(handler.authentication).toBe("BearerAuth")
    //   })
    // })

    describe("RequestContext", function() {

      const endpoint = {
        post: {
          security: [{
            bearerAuth: []
          }]
        }
      }

      const request = {
        queryStringParameters: {left: "Things"},
        httpMethod: "POST",
        body: '{"name":"thing"}',
        headers: {
          authorization: "Bearer:x"
        }
      };

      const handler = () => {
        console.log("mock")
      }

      test.concurrent("constructs Specification", async function () {
        const specification = new Specification(endpoint.post);
        expect(specification.auth).toBe("BearerAuth");
      })

      test.concurrent("constructs RequestHeaders", async function() {
        const headers = new RequestHeaders(request.headers);
        expect(headers).toBeInstanceOf(RequestHeaders);
        expect(headers.authMethod).toBe("BearerAuth")
      })

      test.concurrent("constructs Request", async function() {
        const _request = new Request(request);
        expect(_request).toBeInstanceOf(Request);
      })

      test.concurrent("constructs Context", async function () {
        const context = new Context(endpoint.post, request, handler);
        expect(context).toBeInstanceOf(Context);
        expect(context.elapsedTime).toBeGreaterThan(0);
      })
    })
    
    // describe("FunctionContext", function() {
    //   test.concurrent("constructs FunctionContext", async function() {
    //     const query = new Query({left: "Things"});
    //     const context = new Context({spec: EXAMPLE_PATH});
    //     expect(context).toBeInstanceOf(FunctionContext);
    //     const ok = context.insertMethod("GET", MOCK_HANDLER);
    //     expect(ok).toBe(true)
    //     const request = context.request(query, "GET");
    //     expect(request).toBeInstanceOf(RequestContext);
    //     const options = context.options();
    //     expect(options.statusCode).toBe(204);
    //     expect(options.headers.allow).toBe("GET");
    //   })

    //   test.concurrent("errors on insert existing key", async function() {
    //     const context = new Context({spec: EXAMPLE_PATH});
    //     let ok = context.insertMethod("GET", MOCK_HANDLER);
    //     expect(ok).toBe(true);
    //     ok = context.insertMethod("POST", MOCK_HANDLER);
    //     expect(ok).toBe(true);
    //     ok = context.insertMethod("GET", MOCK_HANDLER);
    //     expect(ok).toBe(false);
    //   })
    // })
  })

  /**
   * Tests lower-level parts of the API without making HTTP
   * requests.
   */
  describe("cypher middleware", function () {

    describe("Node", function (){

      const EXAMPLE = {
        uuid: "just-a-test"
      };

      test.concurrent("constructs empty node", async function () {
        const node = new Node(undefined, undefined, undefined);
        expect(node.symbol).toBe("n");
        expect(node.label).toBe("");
        expect(node.pattern).toBe("");
        expect(node.uuid).toBe("");
      })

      test.concurrent("constructs labeled node", async function () {
        const node = new Node(undefined, undefined, THINGS);
        expect(node.symbol).toBe("n");
        expect(node.label).toBe(THINGS);
        expect(node.pattern).toBe("");
        expect(node.uuid).toBe("");
      })

      test.concurrent("constructs materialized node", async function () {
        const propString = JSON.stringify(EXAMPLE)
        const node = new Node(propString, undefined, THINGS);
        expect(node.symbol).toBe("n");
        expect(node.label).toBe(THINGS);
        expect(node.pattern).toContain(EXAMPLE.uuid);
        expect(node.uuid).toBe(EXAMPLE.uuid);
      })

      // Test queries that require properties to exist
      test.concurrent.each([
        "create"
      ])("errors on %s query without props", async function(method: string) {
        const node = new Node(undefined, undefined, THINGS);
        expectError(node, method)
      })

      // Test queries that require label to exist
      test.concurrent.each([
        ["count", undefined],
        ["load", undefined],
        ["create", JSON.stringify(EXAMPLE)]
      ])("errors on %s query without label", async function(method: string, props: string) {
        const node = new Node(props, undefined, undefined);
        expectError(node, method)
      })

      test.concurrent.each([
        ["count", true, undefined],
        ["load", true, undefined],
        ["create", false, JSON.stringify(EXAMPLE)]
      ])("produces %s query", async function(method: string, readOnly: boolean, props: string) {
        const node = new Node(props, undefined, THINGS);
        const query = node[method]();
        expect(query.readOnly).toBe(readOnly);
        expect(query.query.length).toBeGreaterThan(0);
      })


      test.concurrent("produces delete query", async function() {
        const node = new Node(undefined, undefined, undefined)
        const query = node.delete();
        expect(query.readOnly).toBe(false);
        expect(query.query.length).toBeGreaterThan(0);
        expect(query.query).toContain("DETACH DELETE");
      })

      test.concurrent.each([
        ["self props", undefined, THINGS, EXAMPLE, THINGS],
        ["self label", EXAMPLE, undefined, EXAMPLE, THINGS],
        ["updates label", EXAMPLE, THINGS, EXAMPLE, undefined],
        ["updates props", EXAMPLE, THINGS, undefined, THINGS],
        ["matching labels", EXAMPLE, THINGS, undefined, "Sensors"]
      ])("errors on mutate query without %s", async function(_, selfProps, selfLabel, insertProps, insertLabel) {
        const _insertProps = typeof insertProps === "undefined" ?
          undefined : JSON.stringify(insertProps)
        const _selfProps = typeof selfProps === "undefined" ?
        undefined : JSON.stringify(selfProps)
        const updates = new Node(_insertProps, undefined, insertLabel);
        const node = new Node(_selfProps, undefined, selfLabel);
        expectError(node, "mutate", updates)
      })

      test.concurrent("produces mutate query", async function() {
        const updates = new Node(JSON.stringify(EXAMPLE), undefined, THINGS);
        const node = new Node(JSON.stringify(EXAMPLE), undefined, THINGS);
        const query = node.mutate(updates);
        expect(query.readOnly).toBe(false);
        expect(query.query.length).toBeGreaterThan(0);
        expect(query.query).toContain("SET");
      })
    })

    describe("Constraint", function() {
      test.concurrent.each([
        ["uniqueConstraint"],
        ["dropIndex"],
        ["createIndex"]
      ])("produces %s query", async function () {
        const constraint = new Constraint(THINGS, "uuid");
        const cypher = constraint.uniqueConstraint();
        expect(cypher).toBeInstanceOf(Cypher);
        expect(cypher.query.length).toBeGreaterThan(0);
        expect(cypher.readOnly).toBe(false);
      })
    })

    describe("Links", function() {
      test.concurrent("constructs blank link", async function() {
        const link = new Links(undefined, undefined, undefined, undefined);
        expect(link.cost).toBe(undefined);
        expect(link.rank).toBe(undefined);
      })

      test.concurrent("constructs weighted link", async function() {
        const link = new Links("Owns", 0, 0, undefined);
        expect(link.cost).toBe(0);
        expect(link.rank).toBe(0)
      })
    })
  })
})

