import React from "react";
import type {GetStaticProps} from "next";

/**
 * Array of references component, no heading
 */
import Reference from "../src/components/References/Reference";
import type {DocumentSerializedType} from "../src/components/References/types";
import useDeserialize from "../src/hooks/useDeserialize";
import styled from "styled-components";

/**
 * The ReferencesPage renders a memoized array of filtered citations
 * listed in article frontmatter. Query for MDX frontmatter for references. 
 * No references can be added that aren't cited within a file.
 */
const ReferencesPage = ({
  className,
  documents
}: {
  className: string
  documents: DocumentSerializedType[]
}) => {
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
type Frontmatter = {metadata: {references: unknown}};

export const getStaticProps: GetStaticProps = async () => {
  
  const {documents} = await import("../public/dev/content.json");
  const getRefs = ({metadata}: Frontmatter)=> metadata.references;
  return {
    props: { 
        documents: documents.flatMap(getRefs),
        description: "See the science",
        title: "References"
    }
}};

