/**
 * React and friends
 */
import React, { FC } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Presentation component
 */
import References from "./References"

/**
 * Type checking
 */
import type { ArticleType } from "./utils"

/**
 * Typography
 */
import { rhythm, scale } from "../../typography";
const { lineHeight, fontSize } = scale(-1 / 5);

/**
 * Base component is a composed wrapper around <article/>,
 * that adds metadata and references sections.
 */
export const Article: FC<ArticleType> = ({
  className,
  data: {
    date,
    title,
    citations,
    tags
  },
  onClickTag,
  children
}) => {
  return (
    <article className={className}>
      <header>
        <h1>{title}</h1>
        {(tags ?? []).map((tag: string) =>
          <a key={`${title} ${tag}`} onClick={onClickTag(tag)}>{tag}</a>
        )}
        <span>{date}</span>
      </header>
      <section>
        {children}
      </section>
      <References citations={citations} />
    </article>
  )
}

/**
 * Styled version of the Article or resource
 */
const StyledArticle = styled(Article)`
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
export default StyledArticle