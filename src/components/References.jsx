import React from "react";
import styled from "styled-components";

const StyledParagraph = styled.p`
    color: orange;
`

export const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    return `${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()} ${journal.toLowerCase()}`.replace(" ", "")
}

export const Reference = ({authors, title, year, pageRange, volume, journal}) => {
    const [start, end] = pageRange;
    return <StyledParagraph>{`${authors.join(", ")}. ${year}. ${title.trim()}. ${journal} ${volume}:${start}–${end}.`}</StyledParagraph>
}