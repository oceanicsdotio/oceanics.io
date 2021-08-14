/**
 * React and friends
 */
import React, {FC} from "react";

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
import { ArticleType } from "./utils"

/**
 * Typography
 */
import { rhythm, scale } from "../../typography";

/**
 * Typography
 */
const { lineHeight, fontSize } = scale(-1 / 5);

/**
 * Base component
 * 
 * @param param0 
 * @returns 
 */
export const Article: FC<ArticleType> = ({
    className,
    frontmatter: {
        date,
        title,
        citations,
        tags
    },
    fields: {
        slug
    },
    onClickTag,
    children
}) => {
    return (
        <article className={className}>
            <header>
                <h1>{title}</h1>
                {tags.map((tag: string) =>
                    <a key={`${slug}-${tag}`} onClick={onClickTag(tag)}>{tag}</a>
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