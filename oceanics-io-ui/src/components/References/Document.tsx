/**
 * React and friends
 */
import React from "react";
import type { FC, MouseEventHandler } from "react"
/**
 * Component level styling
 */
import styled from "styled-components";
/**
 * Components and Types
 */
import type { Document as DocumentType, IStyled } from "./types"
import { Reference } from "./Reference";

export interface IDocument extends IStyled {
  document: DocumentType;
  children: any;
};
interface IDocumentContent extends IDocument {
  onClickLabel: (label: string) => MouseEventHandler<HTMLAnchorElement>;
}

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections. This is used
 * by whatever template renders MDX or other static data
 * into webpages. Previously Gatsby by default, more recently
 * NextJS. 
 * 
 * No longer has a title heading, because this is assumed to be controlled
 * at the page level.
 */
export const Document: FC<IDocumentContent> = ({
  className,
  document: {
    metadata
  },
  children,
  onClickLabel
}) => {
  return (
    <article className={className}>
      <header>
        <h2>{metadata.published.toISOString().replace(/T/, " ").replace(/Z/, "")}</h2>
        <h2>{metadata.labels.map(({value}) => <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>{value}</a>)}</h2>
        <p>{metadata.description}</p>
      </header>
      <hr/>
      <section>
        {children}
      </section>
      <hr/>
      {(metadata.references??[]).map((ref) => <Reference className={"reference"} key={ref.hash} document={ref}/>)}
    </article>
  )
}

/**
 * Styled version of the Document or resource, only adjusts
 * type setting, all other styling is left to Layout and 
 * the parent component.
 */
const StyledDocument = styled(Document)`
  & header {
    & a + a::before {
      content: " / ";
    }
    & h2 {
      font-size: large;
      margin: 0.25em 0;
    }
  }
  .reference {
    margin: 1em 0;
  }
`;

/**
 * Base component is default export
 */
export default StyledDocument