
import {readFile, writeFile} from "fs/promises";
import {v7 as uuid7} from "uuid";
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
  // Strip navigation props from instance
  const _filter = ([key]: [string, unknown]) => !key.includes("@"); 
  const filtered = Object.entries(props).filter(_filter);
  return [
    label,
    uuid,
    Object.fromEntries([...filtered, ["uuid", uuid]])
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
const schemaToLookup = ([label, { examples = [] }]: [string, {examples: any[]}]) => {
  let _flatten = cacheItem.bind(undefined, label)
  return examples.map(_flatten);
}

const parseWreck = ({attributes, geometry}: any) => {
  return {
    name: `${attributes.vesselTerms} (${attributes.record})`,
    description: attributes.history.replaceAll("'", ""),
    location: {
      type: "Point",
      coordinates: [geometry.x, geometry.y, attributes.depth]
    }
  }
}
const getWrecks = async () => {
  const sourcesText = await readFile("locations.yml", "utf-8");
  const {geojson} = yaml.parse(sourcesText);
  const [{url}] = geojson.filter((each: any) => each.id === "wrecks")
  const response = await fetch(url);
  const parsed = await response.json();
  let _flatten = cacheItem.bind(undefined, "Locations")
  return parsed.features.map(parseWreck).map(_flatten)
}

// Command-line args
const [
  specification,
  target
] = process.argv.slice(2)

const specText = await readFile(specification, "utf8");
const {components: {schemas}}: {components: {schemas: any[]}} = JSON.parse(specText);
const all = Object.entries(schemas).flatMap(schemaToLookup);
// const wrecks = await getWrecks()
const wrecks: any[] = []
const fromSpec = (all as [string, string, {uuid?: string}][]).filter(
  ([label]) => extensions.sensing.has(label)
)

const examples = [...wrecks, ...fromSpec]
console.warn(`Writing new unique examples: ${target}`);
await writeFile(target, JSON.stringify(examples));
export {}
