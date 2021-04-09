import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";
import { ghost } from "../palette";

/**
 * An array of links to joining pages
 * @param {*} param0 
 * @returns 
 */
const Tags = ({
    className,
    group,
}) => 
    <div className={className}>
        {group.map(({text, link}, ii) => 
            <Link key={`tags-${ii}`} to={link}>
                {text}
            </Link>
        )}
    </div>


/**
 * Styled version of tags array.
 */
const StyledTags = styled(Tags)`

    margin: 0;
    padding: 0;

    & > * {
        display: inline-block;
        color: ${ghost};
        text-decoration: none;
        color: ${ghost};
        border: 1px solid;
        border-radius: 0.3rem;
        margin: 0.2rem;
        padding: 0.3rem;
    }
`;

export default StyledTags;