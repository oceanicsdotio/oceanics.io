import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, fetchToken, API_PATH, options, testAllowedMethodCount } from "./shared/middleware.spec";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("Index", function () {
  /**
   * Check options on for each number of path segments.
   *
   * The SensorThings standard specifies that the path can be
   * arbitrarily long. However, not all operations make sense
   * for linked nodes, so the API matches against the combination
   * of method and path length.
   */
  describe("Options", function () {
    /**
     * Options for path length zero
     */
    test("reports for base path", async function () {
      const token = await fetchToken();
      const response = await options(token);
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 2);
    });
  })

  describe("Query index", function () {
    test("retrieves collection index", async function () {
      const token = await fetchToken();
      const response = await fetch(`${API_PATH}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `bearer:${token}`,
        },
      });
      expect(response.status).toEqual(200);
      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(1)
      const names = new Set(data.map((item) => item.name));
      expect(EXTENSIONS.auth.every((omit) => !names.has(omit))).toBe(true)
    });
  })
})
