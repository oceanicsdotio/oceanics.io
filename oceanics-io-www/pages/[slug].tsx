import React, { ReactNode, useCallback } from "react";
import { useRouter } from "next/router";
import type { GetStaticPaths, GetStaticProps } from "next";

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
import {Standalone as Squalltalk} from "../src/components/References/Squalltalk";
import type { IDocumentSerialized, QueryType } from "../src/components/References/types";
import useDeserialize from "../src/hooks/useDeserialize";

const embeddedComponents = { Equation, Squalltalk, Inline } as Record<string, ReactNode>;

const ArticlePage = ({
    document,
    source
}: IDocumentSerialized) => {
    const [deserialized] = useDeserialize([document])

    const router = useRouter();
    const props = source as Record<string, unknown>;

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
            <MDXRemote {...props} components={embeddedComponents}/>
        </Document>
    )
};

export default ArticlePage;

export const getStaticProps: GetStaticProps = async (path: {params: {slug: string}}) => {
    const {documents} = await import("../public/dev/content.json");
    const [document] = documents.filter((props) => props.slug === path.params.slug);
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
export const getStaticPaths: GetStaticPaths = async () => {
    const {index} = await import("../public/dev/content.json");
    return {
        paths: index,
        fallback: false
    }
}
