import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";
import { ghost } from "../palette";


const Tags = ({
    className,
    group,
}) => 
    <div className={className}>
        {group.map(({fieldValue, totalCount, link}, ii) => 
            <Link key={`tags-${ii}`} to={link}>
                {`${fieldValue} (${totalCount})`}
            </Link>
        )}
    </div>


const StyledTags = styled(Tags)`

    margin: 0;
    padding: 0;

    & > * {
        display: inline-block;
        color: ${ghost};
        text-decoration: none;
        color: ${ghost};
        border: 0.1rem solid;
        border-radius: 0.3rem;
        margin: 0.2rem;
        padding: 0.3rem;
    }
`;

export default StyledTags;