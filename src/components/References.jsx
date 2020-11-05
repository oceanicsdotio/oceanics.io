import React, {Fragment} from "react";
import styled from "styled-components";
import {Link} from "gatsby";
import {ghost, pink} from "../palette";

const StyledBlock = styled.div`
    color: ${ghost};
    margin-bottom: 1em;
`;

const StyledAnchor = styled.a`
    color: inherit;
`;

const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${pink};
`;


export const REFERENCES_ROOT = "references";

const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    const stringRepr = (`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`).replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    const hash =  hashCode(stringRepr);
    return hash;
};


export const Inline = ({
    authors,
    year,
    title,
    unwrap=false
}) => {
    const NAMED_AUTHORS = 3;
    const nAuthors = authors.length;
    const names = authors.slice(0, Math.min(nAuthors, NAMED_AUTHORS)).map(x => x.split(" ")[0]);
    let nameString;
    if (nAuthors === 1) {
        nameString = names[0];
    } else if (nAuthors > NAMED_AUTHORS) {
        nameString = `${names[0]} et al `;
    } else {
        nameString = [names.slice(0, names.length-1).join(", "), names[names.length-1]].join(" & ")
    }
    
    const text = unwrap ? `${nameString} (${year})` : `(${nameString} ${year})`;
   
    return <a href={`#${referenceHash({authors, title, year})}`}>{text}</a>;
};

export const Reference = ({
    authors,
    year,
    title,
    journal = null,
    volume = null, 
    pageRange = null, 
    hash = null
}) => {

    const pages = pageRange ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
    const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${journal||""} ${volume||""}${pages}`;
    const _hash = hash || referenceHash({authors, title, year});

    return <StyledBlock key={hash}>
        {text}
        <StyledLink to={`/${REFERENCES_ROOT}/${_hash}/`}>{"[links]"}</StyledLink>
    </StyledBlock>
    
};

export default ({heading, references}) => {

    return <>
        {references ? <StyledAnchor id={"references"}><h1>{heading}</h1></StyledAnchor> : null}
        {references.map((props) => {
            const hash = referenceHash(props);
            return (
                <Fragment key={hash}>
                    <a id={hash} />
                    <Reference {...props}/>
                </Fragment>
            );
        })}
    </>
};