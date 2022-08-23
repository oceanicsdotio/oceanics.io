import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { fetchToken, apiFetch, API_PATH } from "../test-utils";

describe("topology", function () {
  describe("join Nodes", function() {
    test("join two well-known nodes",  async function() {
      const token = await fetchToken();
      const things = await apiFetch(token, `${API_PATH}/Things`)();
      const {value: [{uuid: thingsId}]} = await things.json();
      const locations = await apiFetch(token, `${API_PATH}/Locations`)();
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
    }, 5000)
  })
});
