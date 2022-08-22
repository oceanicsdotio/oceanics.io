import { describe, expect, test } from '@jest/globals';
import { apiFetch, EXTENSIONS, fetchToken, options, WELL_KNOWN_NODES, writeTransaction, batch,testAllowedMethodCount } from "./shared/middleware.spec";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("Sensing API", function () {

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
     * Options for path length one
     */
    test("reports for single-node path", async function () {
      const token = await fetchToken();
      const response = await options(token, "Things");
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });

  });

  /**
   * Test entity creation and request validation by passing data
   * through the API and database and ensuring that it comes back
   * in expected format.
   */
  describe("Create sensing nodes", function () {

    for (const nodeType of EXTENSIONS.sensing) {
      test(`creates ${nodeType}`, async function () {
        const responses: any[] = await batch(writeTransaction, nodeType, WELL_KNOWN_NODES[nodeType]);
        expect(responses.length).toBeGreaterThanOrEqual(1)
        responses.forEach(({ value: response }) => {
          expect(response.status).toEqual(204);
        });
        
      }, 5000);
    }
  });

  describe("Verify persisted data", function () {
    describe("Query collection", function () {
      /**
       * After the graph has been population there should be some number
       * of each type of entity node. The number of nodes in the response
       * should be predicted from the the example nodes in the API spec.
       */
      for (const nodeType of EXTENSIONS.sensing) {
        test(`retrieves index of ${nodeType}`, async function () {
          const token = await fetchToken();
          const data = await apiFetch(token)(nodeType);
          const actual = data["@iot.count"];
          const expected = WELL_KNOWN_NODES[nodeType].length;
          expect(expected).toBe(actual);
        });
      }
    });
  })
});
