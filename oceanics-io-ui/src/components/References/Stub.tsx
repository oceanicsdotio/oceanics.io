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
import type { ArticleType } from "./utils";

/**
 * List view of an article
 */
export const Stub: FC<ArticleType> = ({
  className,
  frontmatter: {
    title,
    date,
    description,
    tags
  },
  fields: {
    slug
  },
  onClickTag
}) => {
  return (
    <article className={className}>
      <header>
        <a href={slug}>{title}</a>
        <span>{date}</span>
      </header>
      <section>
        {description}
      </section>
      {tags.map((tag: string) =>
        <a key={`${slug}-${tag}`} onClick={onClickTag(tag)}>{tag}</a>
      )}
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