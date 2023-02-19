import fetch from "node-fetch";
import { describe, expect, test, beforeAll } from '@jest/globals';
import { API_PATH, fetchToken, Authorization, register as registerRequest } from "./test-utils";
import { uniqueConstraint } from "../src/shared/queries";
import { remove } from "../src/auth";
import specification from "../src/shared/bathysphere.json";

import {
  panicHook as enableWasmLog,
  Context,
  Request,
  Endpoint,
  Specification,
  User
} from "oceanics-io-api-wasm";

const AUTH_PATH = `${API_PATH}/auth`;

// Bubble up stack trace from Rust
beforeAll(enableWasmLog)

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
      ["LOGTAIL_SOURCE_TOKEN"],
      ["NEO4J_HOSTNAME"],
      ["NEO4J_ACCESS_KEY"],
      ["LOGTAIL_SOURCE_TOKEN"]
    ])(`%s is in environment`, async function(key: string) {
      const value = process.env[key];
      expect(typeof value).toBe("string");
      expect(value).not.toBeFalsy();
    });
  })

  /**
   * Create uniqueness definitions
   */
  describe("auth unique constraints", function () {
    test.concurrent.each([
      ["Provider", "domain"],
      ["Provider", "apiKey"],
      ["User", "email"]
    ])(`%s.%s`, async function (label: string, key: string) {
      await uniqueConstraint(label, key);
    })
  })

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("auth.delete", function () {

    const DELETE = {
      body: "",
      httpMethod: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer:mock`,
      },
      queryStringParameters: {}
    }

    test("auth.delete routing", async function () {
      const request = new Request(DELETE);
      const spec = specification.paths["/auth"]
      expect(request).toBeInstanceOf(Request);
      const endpoint = new Endpoint(spec);
      const inserted = endpoint.insertMethod(DELETE.httpMethod, remove);
      expect(inserted).toBeTruthy();
      expect(endpoint.has_method(DELETE.httpMethod)).toBeTruthy();
      const copy = endpoint.get_specification(request.httpMethod);
      expect(copy).toBeInstanceOf(Specification);

      const token = await fetchToken();
      const context = endpoint.context({
        ...DELETE,
        headers: {
          ...DELETE.headers,
          authorization: `bearer:${token}`
        }
      });
      expect(context).toBeInstanceOf(Context);
      console.log({headers: context.request.headers})
      expect(context.user).toBeInstanceOf(User);
    });

    /**
     * Fails on empty database.
     */
    test("clears non-provider nodes", async function () {
      const token = await fetchToken();


      const response = await fetch(`${API_PATH}/auth`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `bearer:${token}`,
        },
      })
      expect(response.status).toBe(204);
    });
  });

  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes.
   */
  describe("auth.post", function () {

    test("allows registration with valid API key", async function () {
      const response = await registerRequest(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(200);
    });

    test("prevents duplicate registration", async function () {
      const response = await registerRequest(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies missing API key with 403", async function () {
      const response = await registerRequest("");
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies invalid API key with 403", async function () {
      const response = await registerRequest("not-a-valid-api-key");
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
