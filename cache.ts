/**
 * Translate from OpenAPI schema examples and other sources
 * to simple table used in per-entity concurrent unit tests.
 * 
 * Result will have no topological metadata, and will
 * be populated with UUID for each record. This is used
 * to reference instances across test runs.
 */
import fs from "fs/promises";
import path from "path";
import {parseAllDocuments} from "yaml";

// Command-line args
const [
  CACHE
] = process.argv.slice(2)

const ENCODING = "utf8";
const ASSETS = "./public/assets";
const ICON_METADATA = `${ASSETS}/oceanside.yml`;

// Concurrently load all of the idempotent data for processing
const [
  _icons,
  _assets
] = await Promise.all([
  fs.readFile(path.join(process.cwd(), ICON_METADATA), ENCODING),
  fs.readdir(path.join(process.cwd(), ASSETS))
]);

// Utility functions for chaining
const filterPng = (name: string) => name.endsWith(".png");
const wrapSlug = (slug: string) => Object({ slug });

// Structure cache data
const data = {
  icons: {
      sources: _assets.filter(filterPng).map(wrapSlug),
      templates: parseAllDocuments(_icons).map((doc) => doc.toJSON())
  }
}

// Write out the cache
console.warn(`writing new cache: ${CACHE}`);
await fs.writeFile(CACHE, JSON.stringify(data));

export {}
