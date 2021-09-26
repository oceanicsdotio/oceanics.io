import fs from "fs";
import matter from "gray-matter";
import { Document } from "oceanics-io-ui/build/components/References/types";

const DIRECTORY = "../resources";

export const indexMarkdownContent = () =>
    fs.readdirSync(DIRECTORY)
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => Object({ params: { slug: name.split(".").shift() } }))

export const readMarkdownContent = (slug) => {
    const { data, content } = matter(fs.readFileSync(`${DIRECTORY}/${slug}.mdx`, "utf8"));
    return {
        props: {
            document: new Document({
                metadata: data,
                content
            })
        }
    }
};

export const readAllMarkdownContent = () => {
    const index = indexMarkdownContent();
    return {
        props: {
            documents: index.map(({ params: { slug } }) => readMarkdownContent(slug))
        }
    }
}

export const readAllMarkdownCitations = () => {
    const allMarkdown = readAllMarkdownContent();
    const documents = allMarkdown.props.documents.flatMap(
        (each) => each.props.document.metadata.references
    );
    return { props: { documents } }
}
