import { describe, expect, test, beforeAll } from '@jest/globals';
import btoa from "btoa";
import {
  // Helpers,
  panicHook as enableWasmLog,
  // Authentication related
  User,
  // Data Layer Primitives
  Links,
  // Request related
  Context,
  LogLine,
  QueryStringParameters,
  Request, 
  Headers,
  // API endpoint related
  Endpoint,
  ErrorDetail,
} from "oceanics-io-api-wasm";

const THINGS = "Things";


// Bubble up stack trace from Rust
beforeAll(enableWasmLog)

// Can be parallelized
describe("idempotent", function() {
  describe("wasm", function () {
    /**
     * Tests lower-level parts of the API without making HTTP
     * requests.
     */
    describe("cypher", function () {  
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
      const EXAMPLE_REQUEST = {
        ...POST_THINGS_REQUEST, 
        headers: {
          authorization: "testing@oceanics.io:some_password:some_secret"
        }
      }

      describe("endpoint", function() {
        describe("Endpoint", function() {
          test.concurrent("constructs Endpoint", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
          })

          test.concurrent("inserts methods", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            let ok = endpoint.insertMethod("GET");
            expect(ok).toBe(true);
            ok = endpoint.insertMethod("POST");
            expect(ok).toBe(true);
          })

          test.concurrent("errors on insert existing method", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            expect(endpoint).toBeInstanceOf(Endpoint);
            let ok = endpoint.insertMethod("GET");
            ok = endpoint.insertMethod("GET");
            expect(ok).toBe(false);
          })

          test.concurrent("returns options", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            endpoint.insertMethod("GET");
            expect(endpoint.options).toEqual({
              statusCode: 204,
              headers: {
                allow: "OPTIONS,GET"
              }
            })
          })

          test.concurrent("returns request context", async function() {
            const endpoint = new Endpoint(ENDPOINT);
            endpoint.insertMethod("POST");
            const context = endpoint.context(EXAMPLE_REQUEST, process.env.SIGNING_KEY);
            expect(context).toBeInstanceOf(Context);
            console.log("headers:", typeof context.request.headers);
            expect(context.claimAuthMethod).toBe("BasicAuth");
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


        describe("RequestHeaders", function() {

          test.concurrent("constructs RequestHeaders with JWT", async function() {
            const signingKey = "some_secret";
            const token = new User({
              email: "testing@oceanics.io"
            }).issueToken(signingKey);
            
            expect(token.length).toBeGreaterThan(0);
            
            const headers = new Headers(`Bearer:${token}`);

            expect(headers).toBeInstanceOf(Headers);
            expect(headers.claimAuthMethod).toBe("BearerAuth");
          })

          test.concurrent("constructs RequestHeaders from basic auth", async function() {
            const email = "test@oceanics.io";
            const password = "password";
            
            const headers = new Headers(
              `${btoa(email)}:${btoa(password)}:${btoa(process.env.SIGNING_KEY)}`
            );
            expect(headers.claimAuthMethod).toBe("BasicAuth");
            // expect(headers.user().email).toBe(btoa(email));
            // expect(headers.provider()).toBe(null);
          })
        })

        describe("Request", function() {
          test.concurrent("constructs Request", async function() {
            const signingKey = "test_secret";
            const token = new User({
              email: "testing@oceanics.io"
            }).issueToken(signingKey);

            const request = new Request({
              ...POST_THINGS_REQUEST,
              headers: {
                authorization: `Bearer:${token}`
              }
            });
            expect(request).toBeInstanceOf(Request);
          })

          test.concurrent("constructs Request", async function() {
            const signingKey = "test_secret";
            const token = new User({
              email: "testing@oceanics.io"
            }).issueToken(signingKey);

            const request = new Request({
              ...POST_THINGS_REQUEST,
              headers: {
                authorization: `Bearer:${token}`
              }
            });
            expect(request).toBeInstanceOf(Request);
            const check = new Map(Object.entries(JSON.parse(POST_THINGS_REQUEST.body)));
            expect(request.json).toEqual(check);
          })
        })
      })


      describe("Context", function() {
        const signingKey = "test_secret";
        const EXAMPLE_REQUEST = {
          ...POST_THINGS_REQUEST, 
          headers: {
            authorization: "testing@oceanics.io:some_password:some_secret"
          }
        }
        
        test.concurrent("constructs Context", async function () {
          const context = new Context(ENDPOINT.post, EXAMPLE_REQUEST,  signingKey);
          expect(context).toBeInstanceOf(Context);
          expect(context.elapsedTime).toBeGreaterThanOrEqual(0.0);
        })

        test.concurrent("generates LogLine JSON", async function () {
          const context = new Context(ENDPOINT.post, EXAMPLE_REQUEST, signingKey);
          const log = context.logLine("test@oceanics.io", 403);
          delete log.elapsedTime;

          expect(log).toEqual({
            user: "test@oceanics.io", 
            httpMethod: "POST", 
            statusCode: 403,
            auth: "BearerAuth"
          });
          expect(typeof context.elapsedTime).toBe("number");
          expect(context.elapsedTime).toBeGreaterThanOrEqual(0.0);
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
      })
    })
  })
})
