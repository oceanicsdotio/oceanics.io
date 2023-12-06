import React from "react";


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
export const Inline = () => {
    // const doc = new Document({metadata: {
    //     published: (new Date(published, 0, 1)).toISOString(),
    //     authors,
    //     labels: [],
    //     title,
    //     description: "",
    //     publication: "",
    //     volume: "",
    //     pages: []
    // }});
    const doc = {hash: "", inline: () => ""}
    return <a href={`#${doc.hash}`}>{doc.inline()}</a>;
};

export default Inline