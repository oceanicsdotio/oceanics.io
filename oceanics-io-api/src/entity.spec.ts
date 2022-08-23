import fetch from "node-fetch";
import { describe, expect, test, beforeAll } from '@jest/globals';
import { fetchToken, testAllowedMethodCount, EXTENSIONS,  API_PATH, apiFetch } from "../test-utils";
import WELL_KNOWN_NODES  from "./shared/nodes.json";
type Node = {uuid: string};
/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("entity handlers", function () {
  let token: string;
  const flattenNode = ([ label, {uuid} ]: [string, Node]): [string, string] => [label, uuid];
  let NODES: [string, string][] = (Object.entries(WELL_KNOWN_NODES) as [string, any][]).map(flattenNode);

  beforeAll(async () => {
    token = await fetchToken();
  })

  describe("entity.options", function () {
    test.concurrent("options reports allowed methods", async function () {
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
  describe("entity.get", function () {
    test.concurrent.each(NODES)(`verify %s %s`, async function (nodeType: string, uuid: string) {
      const response = await fetch(
        `${API_PATH}/${nodeType}(${uuid})`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `bearer:${token}`,
          },
        }
      );
      expect(response.status).toEqual(200);
      const data = await response.json();
      expect(data.value.length).toBe(1)
      expect(uuid).toBe(data.value[0].uuid)
    })
  })
})
