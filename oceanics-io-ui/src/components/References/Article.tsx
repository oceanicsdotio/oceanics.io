/**
 * React and friends
 */
import React, {ComponentType} from "react";

/**
 * Stylish stuff
 */
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { charcoal, orange, grey, ghost, shadow } from "../../palette";

/**
 * Larger paragraphs
 */
const StyledParagraph = styled.p`
    font-size: larger;
`;

/**
 * Article element, rendered with child metadata 
 */
const StyledArticle = styled.article`

 & h2 {
     margin-bottom: 0;
     padding: 0;
 }

 & small {
     display: block;
     color: ${ghost};
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

 & h2 {
     & a {
         box-shadow: none;
         background-color: ${shadow};
         color: ${orange};
         border: none;
         font-size: inherit;
         text-decoration: underline;
         margin: 0;
         padding: 0;
     }
 } 
`;

type ArticleType = {
    frontmatter: {
        title: string,
        date: string,
        description: string,
        tags: string[]
    },
    fields: {
        slug: string
    },
    index: number,
    search: string,
    linking: {
        LinkComponent: ComponentType,
        key: string
    },
    onSelectValue: Function
}

export const Article = ({
    frontmatter: {
        title,
        date,
        description,
        tags
    },
    fields: {
        slug
    },
    index,
    search,
    linking: {
        LinkComponent = styled.a``,
        key = 'href'
    },
    onSelectValue
}: ArticleType) =>
    <StyledArticle>
        <header>
            <h2>
                <LinkComponent {...{[key]: slug}}>{title}</LinkComponent>
            </h2>
            <small>{date}</small>
        </header>
        <section>
            <StyledParagraph>{description}</StyledParagraph>
        </section>
        {tags.map(tag =>
            <a
                key={`node-${index}-${tag}`}
                onClick={onSelectValue(search, "tag", tag)}
            >
                {tag}
            </a>
        )}
    </StyledArticle>


export default Article