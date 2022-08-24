import crypto from "crypto";
import fs from "fs";

const [
  API_SPECIFICATION,
  CACHE
] = process.argv.slice(2)

/**
 * Translate from OpenAPI schema examples to simple
 * table used in per-entity unit concurrent tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */

// Strip navigation props from instance
const filterNavigation = ([key]) => !key.includes("@");

// Unpack UUI and de-normalize
const flattenNode = (label) => {
  return (props) => {
    const uuid = crypto.randomUUID();
    return [
      label,
      uuid,
      Object.fromEntries(Object.entries({ ...props, uuid }).filter(filterNavigation))
    ]
  }
}
// OpenAPI schema to flat list of examples
const schemaToLookup = ([label, { examples = [] }]) =>
  examples.map(flattenNode(label));

const text = fs.readFileSync(API_SPECIFICATION, "utf-8");
const {components: {schemas}} = JSON.parse(text);
const value = (Object.entries(schemas)).flatMap(schemaToLookup);

console.warn(`writing new cache: ${CACHE}`);
fs.writeFileSync(CACHE, JSON.stringify(value));
