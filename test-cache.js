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

// Commandline args
const [
  API_SPECIFICATION,
  CACHE
] = process.argv.slice(2)

const ASSETS = "./oceanics-io-www/public/assets";
const ICON_METADATA = `${ASSETS}/oceanside.yml`;
const FORMAT = ".mdx";
const REFERENCES = path.join(process.cwd(), "./oceanics-io-content"); 

// Utility functions for chaining
const filterPng = (name) => name.endsWith(".png");
const wrapSlug = (slug) => Object({ slug });
const filterMdx = (name) => name.endsWith(FORMAT);
const getSlug = (name) => Object({ params: { slug: name.split(".").shift() } });

// Read content of a resource and parse it
const readDocument = async ({ params: {slug}}) => {
  const file = path.join(REFERENCES, `${slug}${FORMAT}`);
  return fs.readFile(file, {encoding: "utf8"});
};

// Convert from text to structured data
const parseDocument = (slug) => (text) => {
  const { data: {references=[], ...metadata}, content } = matter(text);
  return {
      metadata: {
          ...metadata,
          references: references.map((metadata) => Object({metadata}))
      },
      content,
      slug
  }
}

// Strip navigation props from instance
const filterNavigation = ([key]) => !key.includes("@");

// Unpack UUI and de-normalize
const flattenNode = (label) => {
  return (props) => {
    const uuid = crypto.randomUUID();
    const filtered = Object.entries(props).filter(filterNavigation);
    return [
      label,
      uuid,
      Object.fromEntries([...filtered, ["uuid", uuid]])
    ]
  }
}
// OpenAPI schema to flat list of examples
const schemaToLookup = ([label, { examples = [] }]) => 
  examples.map(flattenNode(label));

// Concurrently load all of the idempotent data for processing
const [
  _icons,
  _references,
  _assets,
  _text
] = await Promise.all([
  fs.readFile(path.join(process.cwd(), ICON_METADATA), "utf8"),
  fs.readdir(REFERENCES),
  fs.readdir(path.join(process.cwd(), ASSETS)),
  fs.readFile(API_SPECIFICATION, "utf-8")
]);

// Concurrently load all of the MDX files
const index = _references.filter(filterMdx).map(getSlug);
const documents = await Promise.all(index.map(readDocument));

// Structure cache data
const data = {
  nodes: (Object.entries(JSON.parse(_text).components.schemas)).flatMap(schemaToLookup),
  index,
  documents: documents.map(parseDocument),
  icons: {
      sources: _assets.filter(filterPng).map(wrapSlug),
      templates: parseAllDocuments(_icons).map((doc) => doc.toJSON())
  }
}

// Write out the cache
console.warn(`writing new cache: ${CACHE}`);
await fs.writeFile(CACHE, JSON.stringify(data));
