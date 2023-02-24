import { describe, expect, test, beforeAll } from '@jest/globals';
import btoa from "btoa";
import {
  // Helpers,
  panicHook as enableWasmLog,
  // Authentication
  Claims, 
  Security,
  // Data Layer Primitives
  Node,
  Cypher,
  Links,
  Constraint,
  // Request
  Context,
  LogLine,
  QueryStringParameters,
  Request, 
  RequestHeaders,
  Specification,
  // Endpoint
  Endpoint,
  // Response
  ErrorDetail,
  OptionsResponse
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

// Bubble up stack trace from Rust
beforeAll(enableWasmLog)

// Can be parallelized
describe("idempotent", function() {
  describe("wasm", function () {
    // oceanics-io-api-rust/src/authentication
    describe("authentication", function() {
    
      describe("Security", function () {
        test.concurrent("constructs BasicAuth schema", async function () {
          const security = new Security({basicAuth: []})
          expect(security.authentication).toBe("BasicAuth")
        })
  
        test.concurrent("constructs BearerAuth schema", async function () {
          const security = new Security({bearerAuth: []})
          expect(security.authentication).toBe("BearerAuth")
        })
      })
    })

    /**
     * Tests lower-level parts of the API without making HTTP
     * requests.
     */
     describe("cypher", function () {
    
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
    })
    /**
     * Tests lower-level parts of the API without making HTTP
     * requests.
     */
    describe("cypher", function () {
    
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
    })
  
    describe("middleware", function() {

      const ENDPOINT = {
        post: {
          security: [{
            bearerAuth: []
          }]
        }
      }

      const POST_THINGS_REQUEST = {
        queryStringParameters: {left: "Things"},
        httpMethod: "POST",
        body: '{"name":"thing"}',
        headers: {
          authorization: "Bearer:x"
        }
      };

      const HANDLER = () => {
        return "mock"
      }

      describe("endpoint", function() {
        describe("Endpoint", function() {
          test.concurrent("constructs Endpoint", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
          })

          test.concurrent("inserts methods", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
            let ok = endpoint.insertMethod("GET", HANDLER);
            expect(ok).toBe(true);
            ok = endpoint.insertMethod("POST", HANDLER);
            expect(ok).toBe(true);
            const postHandler = endpoint.getMethod("POST");
            expect(postHandler()).toBe("mock");
          })

          test.concurrent("errors on insert existing method", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
            let ok = endpoint.insertMethod("GET", HANDLER);
            ok = endpoint.insertMethod("GET", HANDLER);
            expect(ok).toBe(false);
          })

          test.concurrent("returns options", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            endpoint.insertMethod("GET", HANDLER);
            expect(endpoint.options).toEqual({
              statusCode: 204,
              headers: {
                allow: "OPTIONS,GET"
              }
            })
          })

          test.concurrent("returns request context", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            endpoint.insertMethod("POST", HANDLER);
            const context = endpoint.context(POST_THINGS_REQUEST, process.env.SIGNING_KEY);
            expect(context).toBeInstanceOf(Context);
            expect(context.auth).toBe("BearerAuth");
          })
        })
        
        describe("Specification", function() {
          test.concurrent("constructs Specification", async function () {
            const specification = new Specification(ENDPOINT.post);
            expect(specification.auth).toBe("BearerAuth");
          })
        })
      })

      describe("request", function() {
        
        describe("LogLine", function() {
          test.concurrent("constructs LogLine", async function () {
            const input = {
              user: "user@example.com",
              httpMethod: "GET",
              statusCode: 403,
              elapsedTime: 1.0,
              auth: "BearerAuth"
            }
            const logLine = new LogLine(input);
            expect(logLine).toBeInstanceOf(LogLine);
            const data = logLine.json;
            expect(data).toEqual(input)
          })
        })

        describe("QueryStringParameters", function() {
          test.concurrent("constructs QueryStringParameters", async function() {
            const query = new QueryStringParameters(POST_THINGS_REQUEST.queryStringParameters);
            expect(query.left).toBe(THINGS)
          })
        })

        describe("Request", function() {
          test.concurrent("constructs Request", async function() {
            const request = new Request(POST_THINGS_REQUEST, process.env.SIGNING_KEY);
            expect(request).toBeInstanceOf(Request);
            const check = new Map(Object.entries(JSON.parse(POST_THINGS_REQUEST.body)));
            expect(request.json).toEqual(check);
          })
        })

        describe("RequestHeaders", function() {
          test.concurrent("constructs RequestHeaders", async function() {
            const headers = new RequestHeaders(POST_THINGS_REQUEST.headers, process.env.SIGNING_KEY);
            expect(headers).toBeInstanceOf(RequestHeaders);
            expect(headers.claimAuthMethod).toBe("BearerAuth");
          })

          test.concurrent("constructs RequestHeaders from token", async function() {
            const email = "test@oceanics.io";
            const domain = "oceanics.io";
            const token = (new Claims(email, domain, 3600)).encode(process.env.SIGNING_KEY);
            const _headers = {
              authorization: `Bearer:${token}`
            }
            const headers = new RequestHeaders(_headers, process.env.SIGNING_KEY);
            const {user, provider} = headers;
            expect(user.email).toBe(email);
            expect(provider.domain).toBe(domain);
          })

          test.concurrent("constructs RequestHeaders from basic auth", async function() {
            const email = "test@oceanics.io";
            const password = "password";
            
            const headers = new RequestHeaders({
              authorization: `${btoa(email)}:${btoa(password)}:${btoa(process.env.SIGNING_KEY)}`
            }, "");
            expect(headers.claimAuthMethod).toBe("BasicAuth");
            const {user, provider} = headers;
            expect(user.email).toBe(btoa(email));
            expect(provider).toBe(null);
          })
        })
      })


      describe("Context", function() {
        test.concurrent("constructs Context", async function () {
          const context = new Context(ENDPOINT.post, POST_THINGS_REQUEST, HANDLER);
          expect(context).toBeInstanceOf(Context);
          expect(context.elapsedTime).toBeGreaterThanOrEqual(0.0);
        })

        test.concurrent("generates LogLine JSON", async function () {
          const context = new Context(ENDPOINT.post, POST_THINGS_REQUEST, HANDLER);
          const log = context.logLine("test@oceanics.io", 403);
          delete log.elapsedTime;

          expect(log).toEqual({
            user: "test@oceanics.io", 
            httpMethod: "POST", 
            statusCode: 403,
            auth: "BearerAuth"
          });
          // expect(typeof context.elapsedTime).toBe("number");
          // expect(context.elapsedTime).toBeGreaterThanOrEqual(0.0);
        })
      })

      describe("response", function() {
        describe("error", function () {
          describe("ErrorDetail", function () {
            test.concurrent("not implemented", async function() {
              const detail = ErrorDetail.notImplemented();
              expect(detail.statusCode).toEqual(501);
              expect(detail.data.message).toBe("Not implemented");
            })
            test.concurrent("unauthorized", async function () {
              const detail = ErrorDetail.unauthorized();
              expect(detail.statusCode).toBe(403);
              expect(detail.data.message).toBe("Unauthorized");
            })

            test.concurrent("invalid method", async function() {
              const detail = ErrorDetail.invalidMethod();
              expect(detail.statusCode).toEqual(405);
              expect(detail.data.message).toBe("Invalid HTTP method");
            })
          })
        })

        describe("options", function () {
          describe("OptionsResponse", function () {
            test.concurrent("constructs OptionsResponse", async function() {
              const response = new OptionsResponse("get,post,delete,put");
              expect(response).toBeInstanceOf(Object);
            })
          })
        })
      })
    })
  })
})
