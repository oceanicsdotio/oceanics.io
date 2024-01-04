import fetch from "node-fetch";
import { describe, expect, test, beforeAll } from '@jest/globals';
import { API_PATH, fetchToken, Authorization, register as registerRequest } from "./test-utils";
import * as db from "../src/shared/queries";

import {
  panicHook as enableWasmLog,
  Node
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
      const node = new Node(undefined, undefined, label);
      const {query} = node.uniqueConstraintQuery(key);
      await db.write(query);
    })
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

    test("denies missing header with 401", async function () {
      const response = await fetch(AUTH_PATH);
      try {
        expect(response.status).toEqual(401);
      } catch (err) {
        console.log(await response.json());
        throw err;
      }
    });

    test("denies wrong credentials with 401", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, "a-very-bad-password", undefined),
        },
      });
      const data = await response.json();
      console.warn("Data", data);
      expect(response.status).toEqual(401);
    });

    test("denies wrong salt with 401", async function () {
      const response = await fetch(AUTH_PATH, {
        headers: {
          Authorization: Authorization(undefined, undefined, "a-very-bad-secret"),
        },
      });
      expect(response.status).toEqual(401);
    });
  });
});
