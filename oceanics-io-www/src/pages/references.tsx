/**
 * React and friends. 
 */
import React, { FC } from "react";

/**
 * Array of references component, no heading
 */
import Reference from "oceanics-io-ui/build/components/References/Reference";
import type {Document} from "oceanics-io-ui/build/components/References/types";

interface IReferencesPage {
    documents: Document[];
}

/**
 * The ReferencesPage renders a memoized array of filtered citations
 * listed in article frontmatter. Query for MDX frontmatter for references. 
 * No references can be added that aren't cited within a file.
 */
const ReferencesPage: FC<IReferencesPage> = ({
  documents
}) => {
  return (
      <>
      {documents.map((document) => <Reference key={document.hash} document={document} />)}
      </>
    )
};

export default ReferencesPage;
