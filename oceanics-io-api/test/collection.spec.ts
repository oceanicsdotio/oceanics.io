import { describe, expect, test } from '@jest/globals';
import { Method } from '../src/shared/middleware';
import { apiFetch, testAllowedMethodCount, getNodeTypes, getNodes } from "./test-utils";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("collection handlers", function () {
  describe("collection.options", function () {
    test.concurrent.each(getNodeTypes())("reports allowed methods for %s", async function (nodeType) {
      const response = await apiFetch(nodeType, Method.OPTIONS)();
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });
  });

  /**
   * Test entity creation and request validation by passing data
   * through the API and database and ensuring that it comes back
   * in expected format.
   */
  describe(`collection.post`, function () {
    test.concurrent.each(getNodes())(`creates %s %s`, async function(nodeType, _, properties) {
      const response = await apiFetch(nodeType, Method.POST)(properties);
      expect(response.status).toEqual(204);
    });

    test.concurrent("redirects unknown entity to 404", async function() {
      const response = await apiFetch("Nothings", Method.POST)({});
      expect(response.status).toEqual(404);
    })
  });

  /**
   * After the graph has been population there should be some number
   * of each type of entity node. The number of nodes in the response
   * should be predicted from the the example nodes in the API spec.
   */
  describe("collection.get", function () {
    test.concurrent.each(getNodeTypes())(`retrieves %s (N=%s)`, async function (nodeType, count) {
      expect(typeof count).toBe("number");
      const response = await apiFetch(nodeType, Method.GET)();
      expect(response.status).toBe(200);
      const data = await response.json();
      const actual = data["@iot.count"]
      expect(typeof actual).toBe("number");
      expect(actual).toBe(count);
    });
  })
});
