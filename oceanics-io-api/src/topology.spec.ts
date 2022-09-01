import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { fetchToken, apiFetch, API_PATH } from "./shared/test-utils";

/**
 * Join and drop relationships between nodes.
 */
describe("topology handlers", function () {
  describe("topology.post", function() {
    test("join two well-known nodes",  async function() {
      const token = await fetchToken();
      const things = await apiFetch(`Things`)();
      const {value: [{uuid: thingsId}]} = await things.json();
      const locations = await apiFetch(`Locations`)();
      const {value: [{uuid: locationsId}]} = await locations.json();
      const queryData = {
        Things: thingsId,
        Locations: locationsId,
      }
      const response = await fetch(
        `${API_PATH}/Things(${queryData.Things})/Locations(${queryData.Locations})`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `bearer:${token}`,
          },
          body: JSON.stringify({})
        }
      )
      expect(response.status).toEqual(204);
    })
  })
});
