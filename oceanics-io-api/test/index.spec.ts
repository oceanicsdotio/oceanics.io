import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, apiFetch, testAllowedMethodCount } from "./test-utils";

describe("idempotent", function () {
  /**
   * Collect tests that create, get, and manipulate graph nodes related
   * to sensing
   */
  describe("index handlers", function () {
    describe("index.options", function () {
      test.concurrent("options reports allowed methods", async function () {
        const response = await apiFetch("", "OPTIONS")();
        expect(response.status).toEqual(204);
        testAllowedMethodCount(response.headers, 2);
      });
    })

    /**
     * Fails if database hasn't been populated yet. Relies on real labels,
     * not those defined in the specification/code. 
     */
    describe("index.get", function () {
      test.concurrent("retrieves collection index", async function () {
        const response = await apiFetch("", "GET")();
        expect(response.status).toEqual(200);
        const data = await response.json();
        expect(data.length).toBeGreaterThanOrEqual(1);
        const names = new Set(data.map((item: { name: string }) => item.name));
        expect(EXTENSIONS.auth.every((omit) => !names.has(omit))).toBe(true)
      });
    })
  })
})
