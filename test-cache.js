/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity concurrent unit tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {parseAllDocuments} from "yaml";

// Command-line args
const [
  _,
  CACHE
] = process.argv.slice(2)

const UUID = "uuid";
const ENCODING = "utf8";
const ASSETS = "./oceanics-io-www/public/assets";
const ICON_METADATA = `${ASSETS}/oceanside.yml`;
const FORMAT = ".mdx";
const REFERENCES = path.join(process.cwd(), "./oceanics-io-content"); 


// Concurrently load all of the MDX files
const readContent = async (content) => {
  // Utility functions for chaining
  const _filter = (name) => name.endsWith(FORMAT);
  // Read content of a resource and parse it
  const _read = async (name) => {
    const slug = name.split(".").shift();
    const file = path.join(REFERENCES, `${slug}${FORMAT}`);
    const text = await fs.readFile(file, ENCODING);
    return [
      "Memos",
      slug,
      text
    ]
  };
  return Promise.all(content.filter(_filter).map(_read));
}


// OpenAPI schema to flat list of examples
const schemaToLookup = ([label, { examples = [] }]) => {
  // Strip navigation props from instance
  const _filter = ([key]) => !key.includes("@"); 
  // Unpack UUID and de-normalize
  const _flatten = (props) => {
    const uuid = crypto.randomUUID();
    const filtered = Object.entries(props).filter(_filter);
    return [
      label,
      uuid,
      Object.fromEntries([...filtered, [UUID, uuid]])
    ]
  }
  return examples.map(_flatten);
}

// Concurrently load all of the idempotent data for processing
const [
  _icons,
  _references,
  _assets
] = await Promise.all([
  fs.readFile(path.join(process.cwd(), ICON_METADATA), ENCODING),
  fs.readdir(REFERENCES),
  fs.readdir(path.join(process.cwd(), ASSETS))
]);

// Utility functions for chaining
const filterPng = (name) => name.endsWith(".png");
const wrapSlug = (slug) => Object({ slug });

// Structure cache data
const data = {
  content: await readContent(_references),
  icons: {
      sources: _assets.filter(filterPng).map(wrapSlug),
      templates: parseAllDocuments(_icons).map((doc) => doc.toJSON())
  }
}

// Write out the cache
console.warn(`writing new cache: ${CACHE}`);
await fs.writeFile(CACHE, JSON.stringify(data));

export {}
