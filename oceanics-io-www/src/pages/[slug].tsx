/**
 * React and friends
 */
import React, { FC } from "react";

/**
 * See: https://nextjs.org/blog/markdown
 */
import { serialize } from "next-mdx-remote/serialize"
import { MDXRemote } from "next-mdx-remote"

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
import Document from "oceanics-io-ui/build/components/References/Document";
import type { IDocumentSerialized, DocumentSerializedType } from "oceanics-io-ui/build/components/References/types";
import { readDocument, createIndex } from "../next-util";
import type { GetStaticPaths, GetStaticProps } from "next";
import useDeserialize from "oceanics-io-ui/build/hooks/useDeserialize";

const ArticlePage: FC<IDocumentSerialized> = ({
    document,
    source
}) => {
    const [deserialized] = useDeserialize([document])

    return (
        <Document document={deserialized} >
            <MDXRemote {...source} />
        </Document>
    )
};

ArticlePage.displayName = "Document";
export default ArticlePage;

export const getStaticProps: GetStaticProps = async (slug) => {
    const document = readDocument(slug) as DocumentSerializedType;

    return {
        props: { 
            source: await serialize(document.content),
            document,
            title: document.metadata.title,
            description: document.metadata.description
        }
    }
}

/**
 * Used by NextJS in building
 */
export const getStaticPaths: GetStaticPaths = async () => Object({
    paths: createIndex(),
    fallback: false
})

