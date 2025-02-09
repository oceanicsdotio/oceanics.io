import {  fetchStaticFeatureCollection } from "./examples";

describe("canonical data sources", function () {

    describe("multipolygon", function () {

        test("data reduction", async function () {
            const [reduced, stats] = await fetchStaticFeatureCollection("https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/maine-towns.json");
            expect(reduced.length).toBeGreaterThan(0);
            function testFeature({ features, ...rest }: any) {
                expect(rest.type).toBe("FeatureCollection");
                expect(features.length).toBe(1);
            }
            reduced.forEach(testFeature);
            const delta = stats.before - stats.after;
            expect(delta).toBeGreaterThan(0);
        })
    })
})
