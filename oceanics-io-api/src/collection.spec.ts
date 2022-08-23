import { describe, expect, test } from '@jest/globals';
import { apiFetch, EXTENSIONS, fetchToken, WELL_KNOWN_NODES, testAllowedMethodCount, API_PATH } from "../test-utils";

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
    test.concurrent("options reports allowed methods", async function () {
      const token = await fetchToken();
      const response = await apiFetch(token, `${API_PATH}/Things`, "OPTIONS")();
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });
  });

  /**
   * Test entity creation and request validation by passing data
   * through the API and database and ensuring that it comes back
   * in expected format.
   */
  describe(`Create sensing nodes`, function (nodeType) {

    for (const nodeType of EXTENSIONS.sensing) {
      test.concurrent.each(Array.from(EXTENSIONS.sensing))(`creates $nodeType`, async function (nodeType) {
        const responses: any[] = Promise.allSettled(queue.map(job));
        expect(responses.length).toBeGreaterThanOrEqual(1)
        responses.forEach(({ value: response }) => {
          expect(response.status).toEqual(204);
        });
      }, 5000);
    }
  });

  /**
   * After the graph has been population there should be some number
   * of each type of entity node. The number of nodes in the response
   * should be predicted from the the example nodes in the API spec.
   */
  describe("Verify persisted data", function () {
    const nodeTypes = Array.from(EXTENSIONS.sensing).map(each => [each]);
    test.concurrent.each(nodeTypes)(`retrieves $nodeType collection`, async function (nodeType) {
      const token = await fetchToken();
      const data = await apiFetch(token, nodeType, "GET")();
      expect(WELL_KNOWN_NODES[nodeType].length).toBe(data["@iot.count"]);
    });
  })
  
});
