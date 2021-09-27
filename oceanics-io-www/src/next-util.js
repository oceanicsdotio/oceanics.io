const fs = require("fs");
const matter = require("gray-matter");
const path = require("path");

const DIRECTORY = "references";

const indexMarkdownContent = () => {
    return fs.readdirSync(path.join(process.cwd(), DIRECTORY))
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => Object({ params: { slug: name.split(".").shift() } }))}

const readMarkdownContent = (slug) => {
    const STATIC_SOURCE = path.join(process.cwd(), DIRECTORY)
    const { data, content } = matter(fs.readFileSync(path.join(STATIC_SOURCE, `${slug}.mdx`), "utf8"));
    return {
        metadata: data,
        content
    }
};

const readAllMarkdownContent = () => {
    const index = indexMarkdownContent();
    return index.map((doc) => {
        return readMarkdownContent(doc.params.slug);
    })
}

const readAllMarkdownCitations = () => {
    const allMarkdown = readAllMarkdownContent();
    const references = allMarkdown.flatMap(
        (each) => each.metadata.references ?? []
    );
    return references;
}

module.exports = {
    indexMarkdownContent,
    readAllMarkdownCitations,
    readAllMarkdownContent,
    readMarkdownContent,
    DIRECTORY
}
