import React from "react";
import styled from "styled-components";
import {SHA1} from "crypto-js";
import {Link} from "gatsby";

const StyledParagraph = styled.p`
    color: #AACCCCCC;
`
export const REFERENCES_ROOT = "references"

export const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    return SHA1(`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()} ${journal.toLowerCase()}`.replace(" ", ""))
}

export const Reference = ({
    authors, 
    title, 
    year, 
    pageRange, 
    volume, 
    journal
}) => {

    const pages = pageRange ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
    const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${journal} ${volume}${pages}`;
    const hash = referenceHash({authors, title, year, journal});

    return (
        <StyledParagraph>
            {text}
            <Link to={`/${REFERENCES_ROOT}/${hash}/`}>{"[links]"}</Link>
        </StyledParagraph>
    )
}

export default ({heading, references}) => {
    return (
        <>
        <h2>{heading}</h2>
        {references.map((props) => {
            return <Reference {...props}/>;
        })}
        </>
    )
};