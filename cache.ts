
import {readFile, writeFile} from "fs/promises";
import {randomUUID} from "crypto";
export const EXTENSIONS = {
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

/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity concurrent unit tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
export const schemaToLookup = ([label, { examples = [] }]: [string, {examples: any[]}]) => {
  // Strip navigation props from instance
  const _filter = ([key]: [string, unknown]) => !key.includes("@"); 
  // Unpack UUID and de-normalize
  const _flatten = (props: object) => {
    const uuid = randomUUID();
    const filtered = Object.entries(props).filter(_filter);
    return [
      label,
      uuid,
      Object.fromEntries([...filtered, ["uuid", uuid]])
    ]
  }
  return examples.map(_flatten);
}


// Command-line args
const [
  SPECIFICATION,
  CACHE
] = process.argv.slice(2)

// Concurrently load all of the idempotent data for processing
const text = await readFile(SPECIFICATION, "utf8");
const {components: {schemas}}: {components: {schemas: any[]}} = JSON.parse(text);
const _nodes = Object.entries(schemas).flatMap(schemaToLookup);
/// Sensing Nodes only, re-exported for tests
const nodes = (_nodes as [string, string, {uuid?: string}][]).filter(
  ([label]) => EXTENSIONS.sensing.has(label)
)
console.warn(`Writing new cache: ${CACHE}`);
await writeFile(CACHE, JSON.stringify(nodes));
export {}
