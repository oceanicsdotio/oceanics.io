
import {readFile, writeFile} from "fs/promises";
import {randomUUID} from "crypto";
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

/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity concurrent unit tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
const schemaToLookup = ([label, { examples = [] }]: [string, {examples: any[]}]) => {
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
  specification,
  target
] = process.argv.slice(2)
const text = await readFile(specification, "utf8");
const {components: {schemas}}: {components: {schemas: any[]}} = JSON.parse(text);
const all = Object.entries(schemas).flatMap(schemaToLookup);
const examples = (all as [string, string, {uuid?: string}][]).filter(
  ([label]) => extensions.sensing.has(label)
)
console.warn(`Writing new unique examples: ${target}`);
await writeFile(target, JSON.stringify(examples));
export {}
