const fs = require("fs");
const matter = require("gray-matter");
const path = require("path");

const DIRECTORY = "references";

const createIndex = () => {
    return fs.readdirSync(path.join(process.cwd(), DIRECTORY))
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => Object({ params: { slug: name.split(".").shift() } }))}

const readDocument = (document) => {
    const STATIC_SOURCE = path.join(process.cwd(), DIRECTORY);
    const file = path.join(STATIC_SOURCE, `${document.params.slug}.mdx`);
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    return {
        metadata: data,
        content
    }
};

const readIndexedDocuments = (index) => {
    return index.map((doc) =>readDocument)
}

const readReferencedDocuments = (documents) => {
    return documents.flatMap((each) => each.metadata.references ?? []);
}

module.exports = {
    createIndex,
    readIndexedDocuments,
    readReferencedDocuments,
    readDocument,
    DIRECTORY
}
