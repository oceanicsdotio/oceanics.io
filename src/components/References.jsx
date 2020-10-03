import React, {Fragment} from "react";
import styled from "styled-components";
import {Link} from "gatsby";

const StyledBlock = styled.div`
    color: #AACCCCCC;
`
export const REFERENCES_ROOT = "references"

const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    const stringRepr = (`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()} ${journal.toLowerCase()}`).replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    const hash =  hashCode(stringRepr);
    return hash;
}

export const Reference = ({
    authors,
    year,
    title,
    pageRange, 
    volume, 
    journal
}) => {

    const pages = pageRange ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
    const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${journal} ${volume}${pages}`;
    const hash = referenceHash({authors, title, year, journal});

    return (
        <StyledBlock key={hash}>
            {text}
            <Link to={`/${REFERENCES_ROOT}/${hash}/`}>{"[links]"}</Link>
        </StyledBlock>
    )
}

export default ({heading, references}) => {
    return (
            <>
            <h2>{heading}</h2>
            {references.map((props) => {
                return (
                    <Fragment key={referenceHash(props)}>
                        <Reference {...props}/>
                    </Fragment>
                );
            })}
            </>
       
    )
};