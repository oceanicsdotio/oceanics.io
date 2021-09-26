/**
 * React and friends
 */
import React, { FC } from "react";

/**
 * Runtime input type checking
 */
import type {IDocument} from "./types";

export interface IInline extends IDocument {
    parenthesis: boolean;
};

/**
 Include inline links for references in markdown
 */
export const Inline: FC<IInline> = ({document, parenthesis}) => {
    return <a href={`#${document.hash}`}>{
        parenthesis ? 
        `${document.authors} (${document.year})` : 
        `(${document.authors} ${document.year})`
    }</a>;
};

export default Inline