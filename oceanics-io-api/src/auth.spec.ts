import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { API_PATH, fetchToken } from "./shared/middleware.spec";

/**
 * Stand alone tests for the Auth flow. Includes initial
 * teardown of test artifacts remaining in the graph.
 *
 * On a clean database, the first test will fail.
 */
describe("Auth API", function () {

  const authPath = `${API_PATH}/auth`;

  /**
   * Convenience method for creating consistent test user account under
   * multiple providers.
   */
  const register = (apiKey: string) =>
    fetch(authPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey ?? ""
      },
      body: JSON.stringify({
        email: process.env.SERVICE_ACCOUNT_USERNAME,
        password: process.env.SERVICE_ACCOUNT_PASSWORD,
        secret: process.env.SERVICE_ACCOUNT_SECRET
      }),
    });
  
  /**
   * Check the required environment variables.
   */
  describe("Environment", function () {
    [
      "SERVICE_PROVIDER_API_KEY",
      "SERVICE_ACCOUNT_USERNAME",
      "SERVICE_ACCOUNT_PASSWORD",
      "SERVICE_ACCOUNT_SECRET"
    ].forEach((key) => {
      test(`${key} is in environment`, function () {
        const value = process.env[key];
        expect(typeof value).toBe("string");
        expect(value).not.toBeFalsy();
      });
    })
  })

  /**
   * Isolate destructive actions so that it can be called
   * with mocha grep flag.
   */
  describe("Teardown", function () {
    /**
     * Remove User and and all linked, non-provider nodes.
     * 
     * Removed the route from the API for the time being. 
     */
    test("clears non-provider, nodes", async function () {
      const token = await fetchToken()
      const response = await fetch(authPath, {
        method: "DELETE",
        headers: {
          Authorization: ["BearerAuth", token].join(":"),
        },
      });
      expect(response.status).toBe(204);
    }, 5000);
  });

  /**
   * Test creating a valid new account, and also make sure that bad
   * auth/apiKey values prevent access and return correct status codes.
   */
  describe("Register", function () {
    /**
     * Valid API key will associate new User with an existing Provider
     */
    test("allows registration with API key", async function () {
      const response = await register(process.env.SERVICE_PROVIDER_API_KEY);
      expect(response.status).toEqual(200);
    });

    /**
     * Missing API key is a 403 error
     */
    test("should prevent registration without API key", async function () {
      const response = await register(undefined);
      expect(response.status).toEqual(403);
    });

    /**
     * Invalid API key is a 403 error
     */
    test("should prevent registration with wrong API key", async function () {
      const response = await register("not-a-valid-api-key");
      expect(response.status).toEqual(403);
    });
  });

  /**
   * Test Bearer Token based authentication
   */
  describe("JWT Auth", function () {
    /**
     * Memoize a valid Token
     */
    test("returns well-formed token given credentials", async function () {
      const token = await fetchToken();
      expect(typeof token).toBe("string");
      expect(token).not.toBeFalsy();
    });

    /**
     * Missing header is a 403 error
     */
    test("denies access without credentials", async function () {
      const response = await fetch(authPath);
      expect(response.status).toEqual(403);
    });

    /**
     * Bad credential is a 403 error
     */
    test("denies access with wrong credentials", async function () {
      const response = await fetch(authPath, {
        headers: {
          Authorization: [
            process.env.SERVICE_ACCOUNT_USERNAME, 
            "a-very-bad-password", 
            process.env.SERVICE_ACCOUNT_SECRET
          ].join(
            ":"
          ),
        },
      });
      expect(response.status).toEqual(403);
    });

    /**
     * Bad secret is a 403 error
     */
     test("denies access with wrong salt", async function () {
      const response = await fetch(authPath, {
        headers: {
          Authorization: [
            process.env.SERVICE_ACCOUNT_USERNAME, 
            process.env.SERVICE_ACCOUNT_PASSWORD, 
            "a-very-bad-secret",
          ].join(
            ":"
          ),
        },
      });
      expect(response.status).toEqual(403);
    });
  });

  /**
   * Confirm that JWT can be used to access an endpoint with BearerAuth security
   */
  describe("Manage account", function () {
    /**
     * Update is not implemented
     */
    test("authenticates with JWT", async function () {
      const token = await fetchToken();
      const response = await fetch(authPath, {
        method: "PUT",
        headers: {
          Authorization: ["BearerAuth", token].join(":")
        }
      })
      expect(response.status).toEqual(501)
    })
  })
});

