/**
 * React and friends
 */
import React, { FC } from "react";
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { charcoal, orange, grey, ghost, shadow } from "../../palette";

/**
 * Types
 */
import type { IDocument } from "./types";

/**
 * List view of an article
 */
export const Stub: FC<IDocument> = ({
  className,
  document: {
      metadata: {
        title,
        published,
        description,
        labels
    }
}
}) => {
  return (
    <article className={className}>
      <header>
        <a href={title}>{title}</a>
        <span>{published.toISOString()}</span>
      </header>
      <section>
        {description}
      </section>
      {labels.map(({value, onClick}) => <a key={`${title} ${value}`} onClick={onClick}>{value}</a>)}
    </article>
  )
}

/**
 * Styled version
 */
const StyledStub = styled(Stub)`

  & section {
    font-size: inherit;
  }
  & a {
    display: inline-block;
    text-decoration: none;
    color: ${ghost};
    border: 1px dashed ${grey};
    background-color: ${charcoal};
    border-radius: 5px;
    font-size: smaller;
    margin-right: 5px;
    padding: 2px;
    cursor: pointer;
  }

  & header {
    & a {
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
    & span {
      display: block;
      color: ${ghost};
    }
  } 
    
`;

/**
 * Default export is styled version
 */
export default StyledStub