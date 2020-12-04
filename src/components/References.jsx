import React, {Fragment} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Link } from "gatsby";
import { ghost, pink } from "../palette";


// Single reference, styled for end of document
const Block = styled.div`
    color: ${ghost};
    margin-bottom: 1em;
`;


// Internal page link to navigate from table of contents or inline
const Anchor = styled.a`
    color: inherit;
    visibility: ${({hidden})=>hidden?"hidden":null};
`;


// Links are appended to references
const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${pink};
`;


export const REFERENCES_ROOT = "references";


/**
Some of the canonical fields do not contain uniquely identifying information. Technically,
the same content might appear in two places. 
*/
const referenceHash = ({authors, title, year, journal}) => {
   
    const stringRepr = (`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`).replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    const hash =  hashCode(stringRepr);
    return hash;
};

/**
 Include inline links for references in markdown
 */
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

Inline.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.string),
    year: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    unwrap: PropTypes.bool
};

/**
 Single reference to journal article or similar material.
 */
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

    return <Block key={hash}>
        {text}
        <StyledLink to={`/${REFERENCES_ROOT}/${_hash}/`}>
            {"[links]"}
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

/**
 List of formatted references to append to a document that
 includes citations. 
 */
export const References = ({
    heading="References", 
    references
}) =>
    <>
        <Anchor id={"references"} hidden={!references || !heading}>
            <h1>{heading}</h1>
        </Anchor>
        {
            Object.entries(Object.fromEntries(
                (references||[]).map(props => 
                    [referenceHash(props), props])
            )).map(([hash, props]) => 
                <Fragment key={hash}>
                    <a id={hash} />
                    <Reference {...props}/>
                </Fragment>
            )
        }
    </>;


References.propTypes = {
    heading: PropTypes.string,
};

export default References;