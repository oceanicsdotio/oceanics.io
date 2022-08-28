import React from "react";
import type { MouseEventHandler } from "react";
import styled from "styled-components";

import { orange, ghost } from "../../palette";
import type { IDocument } from "./types";

export interface IDocumentStub extends IDocument {
  onClickLabel: (label: string) => MouseEventHandler
}

/**
 * List view of an article
 */
export const Stub = ({
  className,
  document: { slug, metadata },
  onClickLabel
}: IDocumentStub) => {
  return (
    <article className={className}>
      <header>
        <a href={slug}>{metadata.title}</a>
        <p>{metadata.published.toISOString().replace(/T/, " ").replace(/Z/, "")}</p>
      </header>
      <section>{metadata.description}</section>
      <p>{metadata.labels.map(({value}) => 
        <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>{value}</a>)
      }</p>
    </article>
  )
}

/**
 * Styled version
 */
const StyledStub = styled(Stub)`

  a {
    color: ${ghost};
    cursor: pointer;
  }
  a + a::before {
    content: " / ";
  }

  header {
    a {
      box-shadow: none;
      color: ${orange};
      border: none;
      font-size: inherit;
      text-decoration: underline;
      margin: 0;
      padding: 0;
      font-size: x-large;
    }
    span {
      display: block;
      color: ${ghost};
    }
  } 
`;

/**
 * Default export is styled version
 */
export default StyledStub