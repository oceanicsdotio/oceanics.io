/**
 * React and friends
 */
import React from "react";

/**
 * Checked for existence at build.
 */
import { Link } from "gatsby";

/**
 * Stylish stuff
 */
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { charcoal, orange, grey, ghost, shadow } from "../palette";

import { onSelectValue } from "../hooks/useQueryString";

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

export default ({
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
    search
}) => 
    <StyledArticle>
        <header>
            <h2>
                <Link to={slug}>{title}</Link>
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
