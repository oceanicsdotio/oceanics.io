import React from "react";
import type {GetStaticProps} from "next";

/**
 * Array of references component, no heading
 */
import Reference from "../src/components/References/Reference";
import useMemoCache from "../src/hooks/useMemoCache";
import styled from "styled-components";
import type {Memo} from "oceanics-io-www-wasm";

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
  documents: Memo[]
}) => {
  const deserialized = useMemoCache(documents);
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


/**
 * Used only by NextJS.
 */
export const getStaticProps: GetStaticProps = async () => {
  const {content} = await import("../public/nodes.json");
  const getRefs = ({metadata}: {metadata: {references: unknown}}) => metadata.references;
  return {
    props: { 
        documents: documents.flatMap(getRefs),
        description: "See the science",
        title: "References"
    }
}};
