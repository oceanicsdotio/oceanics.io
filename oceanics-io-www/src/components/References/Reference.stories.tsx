import React from 'react';
import type {Meta, Story} from '@storybook/react';
import {createIndex, readIndexedDocuments} from "../../shared";

/**
 * Base component
 */
import Reference from "./Reference";
import GlobalStyle from "../Layout/GlobalStyle"
// import type {IDocument} from "./types";
import {Document} from "./types";
const docs = readIndexedDocuments(createIndex())
.flatMap(({metadata})=>metadata.references)
console.log(docs)

/**
 * Storybook Interface
 */
export default {
    component: Reference
} as Meta;

/**
 * Base case
 */
const Template: Story<{docs: Document[]}> = ({docs}) => {
    return (
        <>
            <GlobalStyle/>
            {docs.map((document) => <Reference key={document.hash} document={document} />)}
        </>
    )
};

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    docs
};