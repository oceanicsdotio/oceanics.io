/**
 * React and friends
 */
import React, { FC } from "react";
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { orange, ghost, shadow } from "../../palette";

/**
 * Types
 */
import type { IDocument } from "./types";

/**
 * List view of an article
 */
export const Stub: FC<IDocument> = ({
  className,
  document: { slug, metadata }
}) => {
  return (
    <article className={className}>
      <header>
        <a href={slug}>{metadata.title}</a>
        <p>{metadata.published.toISOString().replace(/T/, " ").replace(/Z/, "")}</p>
      </header>
      <section>{metadata.description}</section>
      <p>{metadata.labels.map(({value, onClick}) => 
        <a key={`${metadata.title} ${value}`} onClick={onClick}>{value}</a>)
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
      background-color: ${shadow};
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