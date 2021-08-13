/**
 * react and friends
 */
import React, { FC } from "react"

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
import {referenceHash, ReferenceType} from "./utils";

/**
 Single reference to journal article or similar material.
 */
export const Reference: FC<ReferenceType> = ({
    className,
    authors,
    year,
    title,
    journal = null,
    volume = null,
    pageRange = [],
}) => {
    const pages = pageRange ? `:${pageRange[0]}–${pageRange[1]}.` : ``;
    const text = `${authors.join(", ")}. ${year}. ${title.trim()}. ${journal || ""} ${volume || ""}${pages}`;
    const hash = referenceHash({authors, title, year}).toString();

    return <div key={hash} className={className}>
        <a id={hash} />
        {text}
        <a href={`/?reference=${hash}`}>
            <img src="/favicon.ico" />
        </a>
    </div>
};

export const ReferencePropTypes = {
    className: PropTypes.string.isRequired,
    authors: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
    year: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    journal: PropTypes.string,
    volume: PropTypes.string,
    pageRange: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired
};
Reference.propTypes = ReferencePropTypes;

const StyledReference = styled(Reference)`
    & div {
        color: ${ghost};
        margin-bottom: 1em;
    }
    & img {
        width: 1rem;
        margin-left: 0.2rem;
    }
`;


export default StyledReference