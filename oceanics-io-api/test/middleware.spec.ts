import { describe, expect, test, beforeAll } from '@jest/globals';
import { panicHook as enableWasmLog, Context, Endpoint, User } from "oceanics-io-api-wasm";

// Bubble up stack trace from Rust
beforeAll(enableWasmLog)

// Can be parallelized
describe("idempotent", function () {
  describe("wasm", function () {
    describe("middleware", function () {

      const ENDPOINT = {
        post: {
          security: [{
            bearerAuth: []
          }]
        }
      }

      const SIGNING_KEY = "test_secret";
      const USER = new User({
        email: "testing@oceanics.io",
        password: "some_password",
        secret: "some_secret"
      });

      const TOKEN = USER.issueToken(SIGNING_KEY);

      const EXAMPLE_REQUEST = {
        queryStringParameters: { left: "Things" },
        httpMethod: "POST",
        body: '{"name":"thing"}',
        headers: {
          authorization: `Bearer:${TOKEN}`
        }
      };

      test.concurrent("constructs Endpoint", async function () {
        const endpoint = new Endpoint(
          ["POST"],
          ENDPOINT,
          SIGNING_KEY
        );
        expect(endpoint).toBeInstanceOf(Endpoint);
        expect(JSON.parse(endpoint.options)).toEqual({
          statusCode: 204,
          headers: {
            allow: "POST,OPTIONS"
          }
        })
        const context = endpoint.context(EXAMPLE_REQUEST);
        expect(context).toBeInstanceOf(Context);
        expect(typeof context.elapsedTime).toBe("number");
        expect(context.elapsedTime).toBeGreaterThanOrEqual(0.0);
        const log = context.logLine("test@oceanics.io", 403);
        delete log.elapsedTime;
        expect(log).toEqual({
          user: "test@oceanics.io",
          httpMethod: "POST",
          statusCode: 403,
          auth: "BearerAuth"
        });
      })
    })
  })
})
