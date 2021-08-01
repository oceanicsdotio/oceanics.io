/**
 * React and friends
 */
import React from "react";

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
import { ReferenceType } from "./Reference"

/**
 * Typography
 */
import { rhythm, scale } from "../../typography";

/**
 * Heading
 */
const StyledHeader = styled.h1`
    margin-bottom: 0;
    margin-top: ${() => rhythm(1)};
`;

/**
 * Typography
 */
const { lineHeight, fontSize } = scale(-1 / 5);

/**
 * Basic typography
 */
const StyledParagraph = styled.p`
    display: block;
    margin-bottom: ${() => rhythm(1)};
    font-size: ${fontSize};
    line-height: ${lineHeight};
`;

/**
 * Compile time type checking
 */
type TemplateType = {
    frontmatter: {
        date: string,
        title: string,
        citations: ReferenceType[]
    },
    children: any
}

/**
 * Base component
 * 
 * @param param0 
 * @returns 
 */
export const Template = ({
    frontmatter: {
        date,
        title,
        citations = []
    },
    children
}: TemplateType) => {
    return (
        <article>
            <header>
                <StyledHeader>{title}</StyledHeader>
                <StyledParagraph>{date}</StyledParagraph>
            </header>
            {children}
            <References heading={""} references={citations} />
        </article>
    )
}

/**
 * Base component is default export
 */
export default Template