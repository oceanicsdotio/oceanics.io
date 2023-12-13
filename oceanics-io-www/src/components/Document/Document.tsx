import React, { ReactNode } from "react";
import type { MouseEventHandler } from "react";
import styled from "styled-components";

/**
 * Components and Types
 */
import type { Memo } from "oceanics-io-www-wasm"
import { Reference } from "../References/Reference";
const REFERENCE = "reference";

interface IDocumentContent {
  onClickLabel: (label: string) => MouseEventHandler<HTMLAnchorElement>
  className: string
  document: Memo
  children: ReactNode
}

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections. This is used
 * by whatever template renders MDX or other static data
 * into webpages.
 */
export const Document = ({
  className,
  document: {
    metadata
  },
  children,
  onClickLabel
}: IDocumentContent) => {
  const timestamp = metadata.published.toISOString().replace(/T/, " ").replace(/Z/, "");

  return (
    <article className={className}>
      <header>
        <h2>{timestamp}</h2>
        <h2>
          {metadata.labels.map(({value}) => 
            <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>{value}</a>)}
        </h2>
        <p>{metadata.description}</p>
      </header>
      <hr/>
      <section>
        {children}
      </section>
      <hr/>
      {(metadata.references??[]).map((ref) => <Reference className={REFERENCE} key={ref.hash} document={ref}/>)}
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
  .${REFERENCE} {
    margin: 1em 0;
  }
`;

/**
 * Base component is default export
 */
Document.displayName = "Document";
export default StyledDocument;
