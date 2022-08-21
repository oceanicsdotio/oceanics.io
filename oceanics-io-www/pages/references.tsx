import React from "react";

/**
 * Array of references component, no heading
 */
import Reference from "../src/components/References/Reference";
import type {IDocumentIndexSerialized} from "../src/components/References/types";
import type {GetStaticProps} from "next";
import {createIndex, readIndexedDocuments} from "../src/next-util";
import useDeserialize from "../src/hooks/useDeserialize";
import styled from "styled-components";

interface IPage extends IDocumentIndexSerialized {
  className: string;
}

/**
 * The ReferencesPage renders a memoized array of filtered citations
 * listed in article frontmatter. Query for MDX frontmatter for references. 
 * No references can be added that aren't cited within a file.
 */
const ReferencesPage = ({
  className,
  documents
}: IPage) => {
  const deserialized = useDeserialize(documents);
  return (
    <div className={className}>
      {deserialized.map((document) => <Reference key={document.hash} document={document} />)}
    </div>
  )
};

ReferencesPage.displayName = "References";
const StyledRefPage = styled(ReferencesPage)`
  ${Reference} {
    margin: 1em 0;
  }
`;

export default StyledRefPage;

export const getStaticProps: GetStaticProps = () => Object({
    props: { 
        documents: readIndexedDocuments(createIndex()).flatMap(({metadata}: any)=>metadata.references),
        description: "See the science",
        title: "References"
    }
});

