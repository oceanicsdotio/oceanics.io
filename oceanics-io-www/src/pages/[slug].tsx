/**
 * React and friends
 */
import React, {FC} from "react";

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
import Document from "oceanics-io-ui/build/components/References/Document";
import { Document as DocumentClass, MetadataSerializedType} from "oceanics-io-ui/build/components/References/types";
import type {IDocument} from "oceanics-io-ui/build/components/References/Document";
import { readMarkdownContent, indexMarkdownContent } from "../next-util";
import type {GetStaticPaths, GetStaticProps} from "next";


const ArticlePage: FC<IDocument> = ({
  document
}) => {
  return <Document document={document}/>
};

export default ArticlePage;

const DIRECTORY = "../resources";

export const getStaticProps: GetStaticProps = async ({ params: {slug} }) => {
    const {data, content} = readMarkdownContent(slug)
    return {props: {
        document: new DocumentClass({
            metadata: data as MetadataSerializedType,
            content
        })
    }}
}

/**
 * Used by NextJS in building
 */
export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: indexMarkdownContent(),
        fallback: false
    }
}
    
