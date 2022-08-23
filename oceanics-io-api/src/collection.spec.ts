import { describe, expect, test, beforeAll } from '@jest/globals';
import { Method } from './shared/middleware';
import { apiFetch, fetchToken, testAllowedMethodCount, API_PATH, NODE_TYPES } from "../test-utils";
import WELL_KNOWN_NODES from "./shared/nodes.json";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("collection handlers", function () {
  let NODES: [string, string, Object][];

  // Load data structure with pre-generated UUID
  beforeAll(() => {
    NODES = NODE_TYPES.flatMap(([label]) => WELL_KNOWN_NODES[label].map(({uuid, ...value}) => {
      const props = Object.fromEntries(Object.entries(value).filter(([key]) => !key.includes("@")))
      return [label, uuid, {...props, uuid}]
    }))
  })

  /**
   * Check options on for each number of path segments.
   *
   * The SensorThings standard specifies that the path can be
   * arbitrarily long. However, not all operations make sense
   * for linked nodes, so the API matches against the combination
   * of method and path length.
   */
  describe("collection.options", function () {
    test.concurrent.each(NODE_TYPES)("reports allowed methods for %s", async function (nodeType) {
      const token = await fetchToken();
      const response = await apiFetch(token, `${API_PATH}/${nodeType}`, Method.OPTIONS)();
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
    test.concurrent.each(NODES)(`creates %s %s`, async function(nodeType, _, properties) {
      const token = await fetchToken();
      const response = await apiFetch(token, `${API_PATH}/${nodeType}`, Method.POST)(properties);
      expect(response.status).toEqual(204);
    });
  });

  /**
   * After the graph has been population there should be some number
   * of each type of entity node. The number of nodes in the response
   * should be predicted from the the example nodes in the API spec.
   */
  describe("collection.get", function () {
    test.concurrent.each(NODE_TYPES)(`retrieves %s`, async function (nodeType) {
      const count = WELL_KNOWN_NODES[nodeType].length;
      expect(typeof count).toBe("number");
      const token = await fetchToken();
      const response = await apiFetch(token, `${API_PATH}/${nodeType}`, Method.GET)();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data["@iot.count"]).toBe("number");
      expect(data["@iot.count"]).toBe(count);
    });
  })
});
