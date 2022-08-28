/**
 * React and friends
 */
import React from "react";

/**
 * Runtime input type checking
 */
import {Document} from "oceanics-io-www-wasm";

// Min required for unique hashing
export interface IInline {
    parenthesis: boolean;
    authors: string[];
    published: number;
    title: string;
}

/**
 Include inline links for references in markdown
 */
export const Inline = ({published, authors, title, parenthesis=false}: IInline) => {
    const doc = new Document({metadata: {
        published: (new Date(published, 0, 1)).toISOString(),
        authors,
        labels: [],
        title,
        description: "",
        publication: "",
        volume: "",
        pages: []
    }});
    return <a href={`#${doc.hash}`}>{
        parenthesis ? 
        `${doc.authors} (${doc.year})` : 
        `(${doc.authors} ${doc.year})`
    }</a>;
};

export default Inline