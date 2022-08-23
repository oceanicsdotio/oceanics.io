import { describe, expect, test } from '@jest/globals';
import { testAllowedMethodCount, apiFetch, getNodes } from "../test-utils";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("entity handlers", function () {
  describe("entity.options", function () {
    test.concurrent("options reports allowed methods", async function () {
      const response = await apiFetch(`Things`, "OPTIONS")();
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });
  });

  /**
   * We are able to get a single node by referencing it's unique
   * identifier. If it does not exist, or is not owned by the user,
   * then receive 404.
   */
  describe("entity.get", function () {
    test.concurrent.each(getNodes())(`verify %s %s`, async function (nodeType: string, uuid: string) {
      const response = await apiFetch(`${nodeType}(${uuid})`, "GET")();
      expect(response.status).toEqual(200);
      const data = await response.json();
      expect(data.value.length).toBe(1)
      expect(uuid).toBe(data.value[0].uuid)
    })
  })
})
