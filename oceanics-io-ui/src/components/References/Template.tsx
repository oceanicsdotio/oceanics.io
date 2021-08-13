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
import { FrontmatterType } from "./utils"

/**
 * Typography
 */
import { rhythm, scale } from "../../typography";

/**
 * Typography
 */
const { lineHeight, fontSize } = scale(-1 / 5);

/**
 * Compile time type checking
 */
type TemplateType = {
    frontmatter: FrontmatterType;
}

/**
 * Base component
 * 
 * @param param0 
 * @returns 
 */
export const Template: FC<TemplateType> = ({
    frontmatter: {
        date,
        title,
        citations = []
    },
    children
}) => {
    return (
        <article>
            <header>
                <h1>{title}</h1>
                <p>{date}</p>
            </header>
            {children}
            <References heading={""} references={citations} />
        </article>
    )
}

const StyledTemplate = styled(Template)`
    & h1 {
        margin-bottom: 0;
        margin-top: ${() => rhythm(1)};
    }
    & p {
        display: block;
        margin-bottom: ${() => rhythm(1)};
        font-size: ${fontSize};
        line-height: ${lineHeight};
    }
`;

/**
 * Base component is default export
 */
export default StyledTemplate