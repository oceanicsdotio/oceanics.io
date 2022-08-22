import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { readTransaction, EXTENSIONS, fetchToken, API_PATH, options } from "./shared/middleware.spec";


/**
 * Returns transaction promise function
 */
const composeWriteTransaction = (token, url) => (data) => {
  return fetch(url, {
    body: JSON.stringify(data),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer:${token}`,
    },
  });
};

/**
 * Execute many requests against a single endpoint, in this case
 * stripping out any topological metadata.
 * 
 * This is specific to creating sensor things style nodes,
 * but is purposefully generic so maybe can be brought into
 * main API
 */
const batch = async (composeTransaction, nodeType, data) => {
  const token = await fetchToken();
  const job = composeTransaction(token, `${API_PATH}/${nodeType}`);
  const queue = data.map((each) =>
    Object.fromEntries(
      Object.entries(each).filter(([key]) => !key.includes("@"))
    )
  );
  return Promise.allSettled(queue.map(job));
};


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
     * Parse and check the number of methods in the Allow header.
     * Does not check that the values are correct, only that the number of
     * them is what is expected.
     */
    const testAllowedMethodCount = (headers, expected) => {
      const allowed = headers.get("allow");
      const methods = (allowed || "").split(",");
      expect(typeof allowed).not.toBe("undefined");
      expect(allowed).not.toBeFalsy();
      expect(methods.length).toBe(expected)
    };

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
  describe("Create nodes", function () {

    const validateBatch = async (batchPromises) => {
      const responses = await batchPromises;
      expect(responses.length).toBeGreaterThanOrEqual(1)
      responses.forEach(({ value: response }) => {
        expect(response.status).toEqual(204);
      });
    };

    /**
     * Create a single Well-Known Entity node.
     */
    for (const nodeType of EXTENSIONS.sensing) {
      test(`creates ${nodeType}`, async function () {
        await validateBatch(
          batch(composeWriteTransaction, nodeType, WELL_KNOWN_NODES[nodeType])
        );
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
          const data = await readTransaction(token)(nodeType);
          const actual = data["@iot.count"];
          const expected = WELL_KNOWN_NODES[nodeType].length;
          expect(expected).toBe(actual);
        });
      }
    });
  })
});
