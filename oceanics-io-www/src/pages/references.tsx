/**
 * React and friends. 
 */
import React, { FC } from "react";

/**
 * Array of references component, no heading
 */
import Reference from "oceanics-io-ui/build/components/References/Reference";
import Layout from "oceanics-io-ui/build/components/Layout/Layout";
import type {IDocumentIndexSerialized} from "oceanics-io-ui/build/components/References/types";
import type {GetStaticProps} from "next";
import {readAllMarkdownCitations} from "../next-util";
import useDeserialize from "../hooks/useDeserialize";
import Head from "next/head";

/**
 * The ReferencesPage renders a memoized array of filtered citations
 * listed in article frontmatter. Query for MDX frontmatter for references. 
 * No references can be added that aren't cited within a file.
 */
const ReferencesPage: FC<IDocumentIndexSerialized> = ({
  documents
}) => {
  const deserialized = useDeserialize(documents);
  return (
    <Layout
        description={"See the science"}
        title={"References"}
        HeadComponent={Head}
    >
      {deserialized.map((document) => <Reference key={document.hash} document={document} />)}
    </Layout>
  )
};

ReferencesPage.displayName = "References";
export default ReferencesPage;

export const getStaticProps: GetStaticProps = () => {
    const allReferences = readAllMarkdownCitations();
    console.log("References", JSON.stringify(allReferences));
  return {
      props: {
          documents: allReferences
      }
    }
  };

