import { describe, expect, test } from '@jest/globals';
import { apiFetch } from "./test-utils";

export const GEOMETRY = "https://gis.maine.gov/arcgis/rest/services/Boundaries/Maine_Boundaries_Town_Townships/MapServer/2/query?where=LAND%20%3D%20%27n%27&outFields=OBJECTID,TOWN,COUNTY,ISLAND,ISLANDID,TYPE,Shape,GlobalID,Shape.STArea(),last_edited_date,CNTYCODE&outSR=4326&f=json"




describe("storage handlers", function () {
    describe("storage.get", function () {
        test("", async function() {
            const key = "MidcoastMaineMesh/midcoast_nodes.csv";
            const result = await apiFetch(`storage?key=${key}`, "GET")();
            expect(result.status).toBe(200);
        })
    })
})