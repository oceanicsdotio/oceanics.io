import { readFileSync, writeFileSync } from "fs";
import { v7 as uuid7 } from "uuid";

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
const schemaToLookup = ([label, { examples = [] }]: [string, { examples: object[] }]) => {
  const _flatten = cacheItem.bind(undefined, label)
  return examples.map(_flatten);
}

const reducePrecision = (data: object | number[], precision: number) => {
  const replacer = function (_: string, val: number | string): number | string {
    return (typeof val === "number") ? Number(val.toFixed(precision)) : val;
  }
  return JSON.stringify(data, replacer)
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
    const { components: { schemas } }: { components: { schemas: Record<string, { examples: object[] }> } } = JSON.parse(specText);
    const all = Object.entries(schemas).flatMap(schemaToLookup);

    const fromSpec = (all as [string, string, { uuid?: string }][]).filter(
      ([label]) => extensions.sensing.has(label)
    )

    const examples = [...fromSpec];

    console.warn(`Writing new unique examples: ${target}`);
    writeFileSync(target, reducePrecision(examples, 5));
  }
}

export { }
