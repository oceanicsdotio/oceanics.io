const fs = require("fs");
const matter = require("gray-matter");
const path = require("path");

const DIRECTORY = "references";

const createIndex = () => {
    return fs.readdirSync(path.join(process.cwd(), DIRECTORY))
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => Object({ params: { slug: name.split(".").shift() } }))}

const readDocument = (doc) => {
    const STATIC_SOURCE = path.join(process.cwd(), DIRECTORY);
    const file = path.join(STATIC_SOURCE, `${doc.params.slug}.mdx`);
    const { data: {references=[], ...metadata}, content } = matter(fs.readFileSync(file, "utf8"));
    return {
        metadata: {
            ...metadata,
            references: references.map((metadata) => Object({metadata}))
        },
        content,
        slug: doc.params.slug
    }
};

const readIndexedDocuments = (index) => {
    return index.map(readDocument)
}

module.exports = {
    createIndex,
    readIndexedDocuments,
    readDocument,
    DIRECTORY
}
