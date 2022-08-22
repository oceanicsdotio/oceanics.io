import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { API_PATH, fetchToken, Authorization, register, apiFetch } from "./shared/middleware.spec";

const AUTH_PATH = `${API_PATH}/auth`;

/**
 * Stand alone tests for the Auth flow. Includes initial
 * teardown of test artifacts remaining in the graph.
 *
 * On a clean database, the first test will fail.
 */
describe("auth", function () {

  /**
   * Check the required environment variables.
   */
  describe("environment", function () {
    test.concurrent.each([
      ["SERVICE_PROVIDER_API_KEY"],
      ["SERVICE_ACCOUNT_USERNAME"],
      ["SERVICE_ACCOUNT_PASSWORD"],
      ["SERVICE_ACCOUNT_SECRET"]
    ])(`%s is in environment`, async function(key: string) {
      const value = process.env[key];
      expect(typeof value).toBe("string");
      expect(value).not.toBeFalsy();
    });
  })

  let expectRegistrationToFail = true;

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("teardown", function () {
    test("clears non-provider, nodes", async function () {
      const token = await fetchToken();
      const response = await apiFetch(token, AUTH_PATH, "DELETE")();
      expect(response.status).toBe(204);
      expectRegistrationToFail = false;
    }, 5000);
  });

  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes.
   */
  describe("register", function () {

    (expectRegistrationToFail ? test.skip : test.concurrent)("allows registration with valid API key", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(200);
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
  describe("login", function () {

    test.concurrent("prevents duplicate registration", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY??"");
      expect(response.status).toEqual(403);
    });

    test.concurrent("returns well-formed token", async function () {
      const token = await fetchToken();
      expect(typeof token).toBe("string");
      expect(token).not.toBeFalsy();
    });

    test.concurrent("denies missing header with 403", async function () {
      const response = await fetch(AUTH_PATH);
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies wrong credentials with 403", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, "a-very-bad-password", undefined),
        },
      });
      expect(response.status).toEqual(403);
    });

    test.concurrent("denies wrong salt with 403", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, undefined, "a-very-bad-secret"),
        },
      });
      expect(response.status).toEqual(403);
    });
  });
});
