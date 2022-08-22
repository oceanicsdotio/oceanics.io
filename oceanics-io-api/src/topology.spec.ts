import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { fetchToken, apiFetch, API_PATH } from "./shared/middleware.spec";


describe("Topology", function () {
  describe("Join Nodes", function() {
    test("join two well-known nodes",  async function() {
      const token = await fetchToken();
      const things = await apiFetch(token, `${API_PATH}/Things`)();
      const locations = await apiFetch(token, `${API_PATH}/Locations`)();
      const queryData = {
        Things: things.value[0].uuid,
        Locations: locations.value[0].uuid,
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
