import fetch from "node-fetch";
import btoa from "btoa";
import { describe, expect, test, beforeAll } from '@jest/globals';
import { API_PATH, fetchToken, Authorization, register, apiFetch } from "./test-utils";
import { Provider, Security, User, Node, panic_hook } from "oceanics-io-api-wasm";

const AUTH_PATH = `${API_PATH}/auth`;

// Bubble up stack trace from Rust
beforeAll(panic_hook)

describe("idempotent", function () {
  describe("authentication middleware", function() {

    test.concurrent("constructs ApiKeyAuth schema", async function () {
      const security = new Security({apiKeyAuth: []})
      expect(security.authentication).toBe("ApiKeyAuth")
    })
    test.concurrent("constructs BasicAuth schema", async function () {
      const security = new Security({basicAuth: []})
      expect(security.authentication).toBe("BasicAuth")
    })
    test.concurrent("constructs Security schema", async function () {
      const security = new Security({bearerAuth: []})
      expect(security.authentication).toBe("BearerAuth")
    })
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
    test.concurrent("constructs Provider", async function() {
      const provider = new Provider({
        apiKey: "this-is-my-key",
        domain: "oceanics.io"
      });
      expect(provider.node).toBeInstanceOf(Node);
    })
  })
})

/**
 * Stand alone tests for Auth flow. Includes initial
 * teardown of test artifacts remaining in the graph.
 */
describe("auth handlers", function () {
  /**
   * Check required environment variables.
   */
  describe("environment variables", function () {
    test.concurrent.each([
      ["SERVICE_PROVIDER_API_KEY"],
      ["SERVICE_ACCOUNT_USERNAME"],
      ["SERVICE_ACCOUNT_PASSWORD"],
      ["SERVICE_ACCOUNT_SECRET"],
      ["LOGTAIL_SOURCE_TOKEN"]
    ])(`%s is in environment`, async function(key: string) {
      const value = process.env[key];
      expect(typeof value).toBe("string");
      expect(value).not.toBeFalsy();
    });
  })

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("auth.delete", function () {
    /**
     * Fails on empty database.
     */
    test("clears non-provider nodes", async function () {
      const response = await apiFetch("auth", "DELETE")();
      expect(response.status).toBe(204);
    });
  });

  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes.
   */
  describe("auth.post", function () {

    test("allows registration with valid API key", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(200);
    });

    test("prevents duplicate registration", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies missing API key with 403", async function () {
      const response = await register("");
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies invalid API key with 403", async function () {
      const response = await register("not-a-valid-api-key");
      expect(response.status).toEqual(403);
    });
  });

  /**
   * Test Bearer Token based authentication
   */
  describe("auth.get", function () {

    test("returns well-formed token", async function () {
      const token = await fetchToken();
      expect(typeof token).toBe("string");
      expect(token).not.toBeFalsy();
    });

    test("denies missing header with 403", async function () {
      const response = await fetch(AUTH_PATH);
      expect(response.status).toEqual(403);
    });

    test("denies wrong credentials with 403", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, "a-very-bad-password", undefined),
        },
      });
      expect(response.status).toEqual(403);
    });

    test("denies wrong salt with 403", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, undefined, "a-very-bad-secret"),
        },
      });
      expect(response.status).toEqual(403);
    });
  });
});
