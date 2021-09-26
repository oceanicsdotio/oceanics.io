/**
 * React and friends
 */
import React, { FC } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Type checking
 */
import type { Document as DocumentType, IStyled } from "./types"
import { Reference } from "./Reference";

/**
 * Typographic configuration.
 */
import { rhythm, scale } from "../../typography";
const { lineHeight, fontSize } = scale(-1 / 5);

export interface IDocument extends IStyled {
    document: DocumentType;
};

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections. This is used
 * by whatever template renders MDX or other static data
 * into webpages. Previously Gatsby by default, more recently
 * NextJS. 
 */
export const Document: FC<IDocument> = ({
  className,
  document
}) => {
  return (
    <article className={className}>
      <header>
        <h1>{document.metadata.title}</h1>
        {document.metadata.labels.map(({value, onClick}) => <a key={`${document.metadata.title} ${value}`} onClick={onClick}>{value}</a>)}
        <span>{document.metadata.published.toISOString()}</span>
      </header>
      <section>
        {document.content}
      </section>
      {(document.metadata.references??[]).map((ref) => <Reference document={ref}/>)}
    </article>
  )
}

/**
 * Styled version of the Document or resource, only adjusts
 * type setting, all other styling is left to Layout and 
 * the parent component.
 */
const StyledDocument = styled(Document)`
  & h1 {
    margin-bottom: 0;
    margin-top: ${() => rhythm(1)};
  }
  & section {
    margin: 2em 0;
  }
  & span {
    display: block;
    margin-bottom: ${() => rhythm(1)};
    font-size: ${fontSize};
    line-height: ${lineHeight};
  }
`;

/**
 * Base component is default export
 */
export default StyledDocument