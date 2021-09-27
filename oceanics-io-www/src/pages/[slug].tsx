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
import Layout from "oceanics-io-ui/build/components/Layout/Layout";
import type { IDocumentSerialized } from "oceanics-io-ui/build/components/References/types";
import { readDocument, createIndex } from "../next-util";
import type { GetStaticPaths, GetStaticProps } from "next";
import useDeserialize from "../hooks/useDeserialize";
import Head from "next/head";

const ArticlePage: FC<IDocumentSerialized> = ({
  document
}) => {
  const [deserialized] = useDeserialize([document])
  return (
      <Layout
        description={deserialized.metadata.description}
        title={deserialized.metadata.title}
        HeadComponent={Head}
      >
    <Document document={deserialized}/>
    </Layout>
    )
};

ArticlePage.displayName = "Document";
export default ArticlePage;

export const getStaticProps: GetStaticProps = async (doc) => Object({
    props: { document: readDocument(doc) }
})

/**
 * Used by NextJS in building
 */
export const getStaticPaths: GetStaticPaths = async () => Object({
    paths: createIndex(),
    fallback: false
})
    
