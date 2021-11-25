/**
 * React and friends. 
 */
import React, { FC } from "react";

/**
 * Array of references component, no heading
 */
import Reference from "oceanics-io-ui/build/components/References/Reference";
import type {IDocumentIndexSerialized} from "oceanics-io-ui/build/components/References/types";
import type {GetStaticProps} from "next";
import {createIndex, readIndexedDocuments} from "../src/next-util";
import useDeserialize from "oceanics-io-ui/build/hooks/useDeserialize";

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
    <>
      {deserialized.map((document) => <Reference key={document.hash} document={document} />)}
    </>
  )
};

ReferencesPage.displayName = "References";
export default ReferencesPage;

export const getStaticProps: GetStaticProps = () => Object({
    props: { 
        documents: readIndexedDocuments(createIndex()).flatMap(({metadata}: any)=>metadata.references),
        description: "See the science",
        title: "References"
    }
});

