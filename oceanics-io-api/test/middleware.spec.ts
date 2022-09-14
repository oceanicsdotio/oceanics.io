import { describe, expect, test, beforeAll } from '@jest/globals';
import btoa from "btoa";
import {
  // Helpers,
  panicHook as enableWasmLog,
  // Authentication
  Claims,
  Provider, 
  Security, 
  User,
  // Data Layer Primitives
  Node,
  Cypher,
  Links,
  Constraint,
  // Request
  Context,
  LogLine,
  Query,
  Request, 
  RequestHeaders,
  Specification,
  // Endpoint
  Endpoint
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
    
      describe("Claims", function() {
        test.concurrent("constructs Claims", async function (){
          const claims = new Claims("test@oceanics.io", "oceanics.io", 3600);
          expect(claims).toBeInstanceOf(Claims);
          const token = claims.encode("secret");
          const reverse = Claims.decode(token, "secret");
          expect(reverse).toBeInstanceOf(Claims);
          expect(reverse.sub).toBe(claims.sub);
          expect(reverse.iss).toBe(claims.iss);
          expect(reverse.exp).toBe(claims.exp);
        })
      })
  
      describe("Provider", function() {
        test.concurrent("constructs Provider", async function() {
          const provider = new Provider({
            apiKey: "this-is-my-key",
            domain: "oceanics.io"
          });
          expect(provider.node).toBeInstanceOf(Node);
        })
      })  
  
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
  
      describe("User", function () {
        test.concurrent("constructs User", async function () {
          const user = new User({
            email: "user@example.com", 
            password: btoa("password"), 
            secret: btoa("secret")
          });
          expect(typeof user.credential).toBe("string");
          expect(user.node).toBeInstanceOf(Node);
        })
  
        test.concurrent("verifies User", async function () {
          const user = new User({
            email: "user@example.com", 
            password: btoa("password"), 
            secret: btoa("secret")
          });
          expect(user.verify(user.credential)).toBe(true);
        })
  
        test.concurrent("errors on bad User credential", async function () {
          const user = new User({
            email: "user@example.com", 
            password: btoa("password"), 
            secret: btoa("secret")
          });
          const wrongPassword = new User({
            email: "user@example.com", 
            password: btoa("not_password"), 
            secret: btoa("secret")
          });
          expect(user.verify(wrongPassword.credential)).toBe(false);
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

      const REQUEST = {
        queryStringParameters: {left: "Things"},
        httpMethod: "POST",
        body: '{"name":"thing"}',
        headers: {
          authorization: "Bearer:x"
        }
      };

      const HANDLER = () => {
        console.log("mock")
      }

      describe("request", function() {
        
        describe("Context", function() {
          test.concurrent("constructs Context", async function () {
            const context = new Context(ENDPOINT.post, REQUEST, HANDLER);
            expect(context).toBeInstanceOf(Context);
            expect(context.elapsedTime).toBeGreaterThan(0);
          })
        })

        describe("LogLine", function() {
          test.concurrent("constructs LogLine", async function () {
            const detail = new LogLine({
              user: "user@example.com",
              httpMethod: "GET",
              statusCode: 403,
              elapsedTime: 1.0,
              auth: "BearerAuth"
            });
            expect(detail).not.toBeFalsy();
          })
        })

        describe("Query", function() {
          test.concurrent("constructs Query", async function() {
            const query = new Query(REQUEST.queryStringParameters);
            expect(query.left).toBe(THINGS)
          })
        })

        describe("RequestHeaders", function() {
          test.concurrent("constructs RequestHeaders", async function() {
            const headers = new RequestHeaders(REQUEST.headers, "secret");
            expect(headers).toBeInstanceOf(RequestHeaders);
            expect(headers.claimAuthMethod).toBe("BearerAuth");
          })

          test.concurrent("constructs RequestHeaders", async function() {
            const email = "test@oceanics.io";
            const domain = "oceanics.io";
            const token = (new Claims(email, domain, 3600)).encode("secret");
            const _headers = {
              authorization: `Bearer:${token}`
            }
            const headers = new RequestHeaders(_headers, "secret");
            const {user, provider} = headers;
            expect(user.email).toBe(email);
            expect(provider.domain).toBe(domain);
          })


        })
    
        describe("Request", function() {
          test.concurrent("constructs Request", async function() {
            const request = new Request(REQUEST);
            expect(request).toBeInstanceOf(Request);
          })
        })
      }) 
      
      describe("endpoint", function() {
        describe("Endpoint", function() {
          test.concurrent("constructs Endpoint", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
          })
        })
        
        describe("Specification", function() {
          test.concurrent("constructs Specification", async function () {
            const specification = new Specification(ENDPOINT.post);
            expect(specification.auth).toBe("BearerAuth");
          })
        })
  
        test.concurrent("errors on insert existing key", async function() {
          const endpoint = new Endpoint(ENDPOINT);
          expect(endpoint).toBeInstanceOf(Endpoint);
          let ok = endpoint.insertMethod("GET", HANDLER);
          expect(ok).toBe(true);
          ok = endpoint.insertMethod("POST", HANDLER);
          expect(ok).toBe(true);
          ok = endpoint.insertMethod("GET", HANDLER);
          expect(ok).toBe(false);
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
  })
})
