import fs from "fs/promises";
import matter from "gray-matter";
import path from "path";
import {parseAllDocuments} from "yaml";

const PUBLIC = "public";
const CACHE = `${PUBLIC}/dev/content.json`;
const ICON_METADATA = `${PUBLIC}/assets/oceanside.yml`;
const FORMAT = ".mdx";
const REFERENCES = path.join(process.cwd(), "references"); 

// Utility functions for chaining
const filterPng = (name) => name.endsWith(".png");
const wrapSlug = (slug) => Object({ slug });
const filterMdx = (name) => name.endsWith(FORMAT);
const getSlug = (name) => Object({ params: { slug: name.split(".").shift() } });

const [
    _icons,
    _references,
    _assets
] = await Promise.all([
    fs.readFile(path.join(process.cwd(), ICON_METADATA), "utf8"),
    fs.readdir(REFERENCES),
    fs.readdir(path.join(process.cwd(), `${PUBLIC}/assets`))
]);

const readDocument = async ({ params: {slug}}) => {
    const file = path.join(REFERENCES, `${slug}${FORMAT}`);
    const text = await fs.readFile(file, {encoding: "utf8"});
    const { data: {references=[], ...metadata}, content } = matter(text);
    return {
        metadata: {
            ...metadata,
            references: references.map((metadata) => Object({metadata}))
        },
        content,
        slug
    }
};

const index = _references.filter(filterMdx).map(getSlug);

await fs.writeFile(CACHE, JSON.stringify({
    index,
    documents: await Promise.all(index.map(readDocument)),
    icons: {
        sources: _assets.filter(filterPng).map(wrapSlug),
        templates: parseAllDocuments(_icons).map((doc) => doc.toJSON())
    }
}))
