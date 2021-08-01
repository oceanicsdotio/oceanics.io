/**
 * react and friends
 */
import React, {ComponentType} from "react"

/**
 * Runtime type checking
 */
import PropTypes from "prop-types"

/**
 * Component level styling
 */
import styled from "styled-components"

/**
 * Colors
 */
 import { ghost } from "../../palette";


 // Single reference, styled for end of document
 const Block = styled.div`
     color: ${ghost};
     margin-bottom: 1em;
 `;


// Links are appended to references
const StyledLink = styled.a`
    & img {
        width: 1rem;
        margin-left: 0.2rem;
    }
`;

/**
 * Compile time type checking
 */
export type ReferenceType = {
    authors: string[],
    year: number,
    title: string,
    journal: string | null,
    volume: string | null,
    pageRange: number[] | null,
    hash: string | null,
    LinkComponent: ComponentType
}


/**
 Single reference to journal article or similar material.
 */
 export const Reference = ({
    authors,
    year,
    title,
    journal = null,
    volume = null, 
    pageRange = [], 
    hash = null
}: ReferenceType) => {
    const pages = pageRange ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
    const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${journal||""} ${volume||""}${pages}`;
    
    return <Block key={hash}>
        {text}
        <StyledLink href={`/?reference=${hash}`}>
            <img src="/favicon.ico"/>
        </StyledLink>
    </Block>
};

Reference.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.string).isRequired,
    year: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    journal: PropTypes.string,
    volume: PropTypes.string, 
    pageRange: PropTypes.arrayOf(PropTypes.number), 
    hash: PropTypes.string
};


export default Reference