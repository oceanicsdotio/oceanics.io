/**
 * react and friends
 */
import React from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Types and ref lookups
 */
import type {IDocument} from "./types";

/**
 Single reference to journal article or similar material.
 */
export const Reference = ({
    className,
    document
}: IDocument) => {
    return <div key={document.hash} className={className}>
        <a id={document.hash} />
        {document.reference}
        <a href={`/?reference=${document.hash}`}>
            <img src="/favicon.ico" />
        </a>
    </div>
};

/**
 * The styled version.
 */
const StyledReference = styled(Reference)`
    & > a {
        & > img {
            width: 1rem;
            margin-left: 0.2rem;
        }
    }
`;

/**
 * Default export is the styled version
 */
export default StyledReference;