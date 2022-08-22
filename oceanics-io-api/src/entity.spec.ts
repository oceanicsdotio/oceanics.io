import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { fetchToken, options, testAllowedMethodCount, EXTENSIONS, WELL_KNOWN_NODES, batch, writeTransaction, API_PATH } from "./shared/middleware.spec";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("Entity", function () {
  describe("Metadata", function () {
    test("reports options", async function () {
      const token = await fetchToken();
      const response = await options(token, "Things");
      expect(response.status).toEqual(204);
      testAllowedMethodCount(response.headers, 3);
    });
  });

  describe("Verify persisted data", function () {

    const CREATED_UUID = {};
    
  
    describe("Query nodes", function () {
      /**
       * We are able to get a single node by referencing it's unique
       * identifier. If it does not exist, or is not owned by the user,
       * then receive 404.
       */
      const validateByType = async (nodeType) => {
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
      }
  
      for (const nodeType of EXTENSIONS.sensing) {
        test(`retrieve ${nodeType} by UUID`, async function () {
          await validateByType(nodeType);
        }, 5000);
      }
    })
  })
  
});
