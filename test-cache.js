/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity unit concurrent tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
import crypto from "crypto";
import fs from "fs/promises";
import matter from "gray-matter";
import path from "path";
import {parseAllDocuments} from "yaml";

// Command-line args
const [
  API_SPECIFICATION,
  CACHE
] = process.argv.slice(2)

const UUID = "uuid";
const ENCODING = "utf8";
const ASSETS = "./oceanics-io-www/public/assets";
const ICON_METADATA = `${ASSETS}/oceanside.yml`;
const FORMAT = ".mdx";
const REFERENCES = path.join(process.cwd(), "./oceanics-io-content"); 

// Utility functions for chaining
const filterPng = (name) => name.endsWith(".png");
const wrapSlug = (slug) => Object({ slug });
const wrapMeta = (metadata) => Object({metadata});
const filterMdx = (name) => name.endsWith(FORMAT);
const getSlug = (name) => Object({ params: { slug: name.split(".").shift() } });

// Read content of a resource and parse it
const readDocument = async ({ params: {slug}}) => {
  const file = path.join(REFERENCES, `${slug}${FORMAT}`);
  const text = await fs.readFile(file, ENCODING);
  const { data: {references=[], ...metadata}, content } = matter(text);
  metadata.references = references.map(wrapMeta);
  return {
      metadata,
      content,
      slug
  }
};

// OpenAPI schema to flat list of examples
const schemaToLookup = ([label, { examples = [] }]) => {
  // Strip navigation props from instance
  const _filterNavigation = ([key]) => !key.includes("@"); 
  // Unpack UUI and de-normalize
  const _flattenNode = (props) => {
    const uuid = crypto.randomUUID();
    const filtered = Object.entries(props).filter(_filterNavigation);
    return [
      label,
      uuid,
      Object.fromEntries([...filtered, [UUID, uuid]])
    ]
  }
  return examples.map(_flattenNode);
}
  

// Concurrently load all of the idempotent data for processing
const [
  _icons,
  _references,
  _assets,
  _text
] = await Promise.all([
  fs.readFile(path.join(process.cwd(), ICON_METADATA), ENCODING),
  fs.readdir(REFERENCES),
  fs.readdir(path.join(process.cwd(), ASSETS)),
  fs.readFile(API_SPECIFICATION, ENCODING)
]);

// Concurrently load all of the MDX files
const index = _references.filter(filterMdx).map(getSlug);
const documents = await Promise.all(index.map(readDocument));

// Parse schema examples
const examples = Object.entries(JSON.parse(_text).components.schemas);
const data = examples.flatMap(schemaToLookup);

// Structure cache data
// const data = {
//   nodes: examples.flatMap(schemaToLookup),
//   index,
//   documents,
//   icons: {
//       sources: _assets.filter(filterPng).map(wrapSlug),
//       templates: parseAllDocuments(_icons).map((doc) => doc.toJSON())
//   }
// }

// Write out the cache
console.warn(`writing new cache: ${CACHE}`);
await fs.writeFile(CACHE, JSON.stringify(data));

export {}
