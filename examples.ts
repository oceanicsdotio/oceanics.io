import { readFileSync, writeFileSync } from "fs";
import { v7 as uuid7 } from "uuid";
import yaml from "yaml";


const extensions = {
  sensing: new Set([
    "Things",
    "Sensors",
    "Observations",
    "ObservedProperties",
    "FeaturesOfInterest",
    "HistoricalLocations",
    "Locations",
    "DataStreams",
  ]),
  tasking: new Set([
    "Tasks",
    "TaskingCapabilities",
    "Actuators"
  ]),
  governing: new Set([
    "Missions",
    "Agents",
    "Services",
    "Goals",
    "Assets",
    "Collections",
    "Providers",
    "Users"
  ]),
};
const cacheItem = (label: string, props: object) => {
  const uuid = uuid7();
  return [
    label,
    uuid,
    { ...props, uuid }
  ]
}
/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity concurrent unit tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
const schemaToLookup = ([label, { examples = [] }]: [string, { examples: any[] }]) => {
  let _flatten = cacheItem.bind(undefined, label)
  return examples.map(_flatten);
}

const parseWreck = ({ attributes, geometry }: any) => {
  return {
    name: `${attributes.vesselTerms} (${attributes.record})`,
    description: attributes.history.replaceAll("'", ""),
    location: {
      type: "Point",
      coordinates: [geometry.x, geometry.y, attributes.depth]
    }
  }
}
export const reducePrecision = (data: Object | Array<number>, precision: number) => {
  const replacer = function (_: string, val: Number | string): Number | string {
    return (typeof val === "number") ? Number(val.toFixed(precision)) : val;
  }
  return JSON.stringify(data, replacer)
}
export function transformFeatureToCollection({ geometry }: any) {
  return cacheItem("Locations", {
    name: undefined,
    encodingType: "application/vnd.geo+json",
    location: geometry
  })
}

async function staticCollectionToLocationTuples(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  return data.features.map(transformFeatureToCollection);
}

export async function fetchStaticFeatureCollection(url: string) {
  const response = await fetch(url);
  const serialized = await response.text();
  const before = serialized.length;
  const data = JSON.parse(serialized);
  let after = 0
  function measureDiff(feature: any) {
    const singleton = transformFeatureToCollection(feature)
    const truncated = reducePrecision(singleton, 5);
    after += truncated.length;
    return singleton
  }
  const result = data.features.map(measureDiff);
  const stats = {
    before,
    after
  }
  return [result, stats]
}

import * as url from 'node:url';

if (import.meta.url.startsWith('file:')) { // (A)
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) { // (B)
    // Command-line args
    const [
      specification,
      target
    ] = process.argv.slice(2)
    const specText = readFileSync(specification, "utf8");
    const { components: { schemas } }: { components: { schemas: any[] } } = JSON.parse(specText);
    const all = Object.entries(schemas).flatMap(schemaToLookup);

    const fromSpec = (all as [string, string, { uuid?: string }][]).filter(
      ([label]) => extensions.sensing.has(label)
    )

    const fromSpaces = await staticCollectionToLocationTuples("https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/maine-towns.json")

    const examples = [...fromSpec, ...fromSpaces];

    console.warn(`Writing new unique examples: ${target}`);
    writeFileSync(target, reducePrecision(examples, 5));
  }
}


export { }
