import React, { useCallback } from "react";
import { useRouter } from "next/router";

/**
 * See: https://nextjs.org/blog/markdown
 */
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/a11y-dark.css";

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
import Document from "../src/components/References/Document";
import Equation from "../src/components/References/Equation";
import Inline from "../src/components/References/Inline";
import {Standalone as Squalltalk} from "../src/components/Squalltalk";
import type { IDocumentSerialized, DocumentSerializedType, QueryType } from "../src/components/References/types";
import { readDocument, createIndex } from "../src/shared";
import type { GetStaticPaths, GetStaticProps } from "next";
import useDeserialize from "../src/hooks/useDeserialize";

const embeddedComponents = { Equation, Squalltalk, Inline };

const ArticlePage = ({
    document,
    source
}: IDocumentSerialized) => {
    const [deserialized] = useDeserialize([document])

    const router = useRouter();

    /**
     * Use next router, and merge query parameters.
     */
    const navigate = useCallback((pathname: string, insert?: QueryType, merge = true) => {
        const query = { ...(merge ? router.query : {}), ...(insert ?? {}) }
        router.push({ pathname, query });
    }, [router]);

    /**
     * Additionally filter by a single label.
     */
    const onClickLabel = useCallback((label: string) => () => {
        navigate("/", {label}, false)
    }, [navigate])

    return (
        <Document document={deserialized} onClickLabel={onClickLabel}>
            <MDXRemote {...source} components={embeddedComponents}/>
        </Document>
    )
};

ArticlePage.displayName = "Document";
export default ArticlePage;

export const getStaticProps: GetStaticProps = async (slug: string) => {
    const document = readDocument(slug) as DocumentSerializedType;
    const source = await serialize(document.content??"", {
        mdxOptions: {
            rehypePlugins: [[rehypeHighlight, {}]]
        }
    });
   
    return {
        props: { 
            source,
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

