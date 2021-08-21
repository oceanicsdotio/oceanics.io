/**
 * React and friends
 */
import React, { FC } from "react";

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types";
import {referenceHash, InlineRefType} from "./utils";


/**
 Include inline links for references in markdown
 */
export const Inline: FC<InlineRefType> = ({
    authors,
    year,
    unwrap = false,
    title,
    namedAuthors = 3
}) => {
    const nAuthors = authors.length;
    const names = authors.slice(0, Math.min(nAuthors, namedAuthors)).map((x: string) => x.split(" ")[0]);
    let nameString;
    if (nAuthors === 1) {
        nameString = names[0];
    } else if (nAuthors > namedAuthors) {
        nameString = `${names[0]} et al `;
    } else {
        nameString = [names.slice(0, names.length - 1).join(", "), names[names.length - 1]].join(" & ")
    }

    const text = unwrap ? `${nameString} (${year})` : `(${nameString} ${year})`;

    return <a href={`#${referenceHash({authors, title, year})}`}>{text}</a>;
};

/**
 * Runtime type checking
 */
Inline.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
    year: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    namedAuthors: PropTypes.number.isRequired,
    unwrap: PropTypes.bool.isRequired
};

export default Inline