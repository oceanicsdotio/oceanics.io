import yaml from "yaml";
import fs from "fs";
import {  fetchStaticFeatureCollection } from "./examples";

describe("canonical data sources", function () {
    let sources: any;
    beforeAll(function () {
        const contents = fs.readFileSync("locations.yml", "utf-8");
        const { geojson } = yaml.parse(contents);
        sources = geojson
    })

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

    describe("aquaculture", function () {

        test("aquaculture leases", async function () {
            const [leases] = sources.filter((each: any) => each.id === "aquaculture-leases-direct")
            const response = await fetch(leases.url);
            const parsed = await response.json()
            expect(parsed.type === "FeatureCollection")
            expect(parsed.features.length > 0)
        })

        test("limited purpose aquaculture licenses", async function () {
            const [licenses] = sources.filter((each: any) => each.id === "limited-purpose-licenses")
            const response = await fetch(licenses.url);
            const parsed = await response.json()
            expect(parsed.type === "FeatureCollection")
            expect(parsed.features.length > 0)

        })
    })
})
