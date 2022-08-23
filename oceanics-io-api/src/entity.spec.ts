import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { fetchToken, testAllowedMethodCount, EXTENSIONS,  API_PATH, apiFetch } from "../test-utils";

const CREATED_UUID = {};

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("entity", function () {
  describe("metadata", function () {
    test.concurrent("options reports allowed methods", async function () {
      const token = await fetchToken();
      const response = await apiFetch(token, `${API_PATH}/Things`, "OPTIONS")();
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });
  });

  /**
   * We are able to get a single node by referencing it's unique
   * identifier. If it does not exist, or is not owned by the user,
   * then receive 404.
   */
  describe("verify persisted data", function () {
    const nodeTypes = Array.from(EXTENSIONS.sensing).map(each => [each])
    test.concurrent.each(nodeTypes)(`retrieve $nodeType by UUID`, async function (nodeType) {
      const token = await fetchToken();
      const things = CREATED_UUID[nodeType]
      const result = things.map(async ({uuid})=> {
        const response = await fetch(
          `${API_PATH}/${nodeType}(${uuid})`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `bearer:${token}`,
            },
          }
        );
        const data = await response.json();
        expect(response.status).toEqual(200);
        expect(data.value.length).toBe(1)
        expect(uuid).toBe(data.value[0].uuid)
      })
      await Promise.all(result)
    }, 5000);
  })
})
