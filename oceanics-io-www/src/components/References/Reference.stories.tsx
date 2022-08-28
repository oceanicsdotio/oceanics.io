import React from 'react';
import type {Meta, Story} from '@storybook/react';

/**
 * Base component
 */
import Reference from "./Reference";
import type {} from "./Reference";
import GlobalStyle from "../Layout/GlobalStyle"
// import type {IDocument} from "./types";
import {Document, DocumentSerializedType} from "./types";
import {documents} from "../../../public/dev/content.json";
const [example] = documents.filter(({slug}) => slug === "a-small-place");

/**
 * Storybook Interface
 */
export default {
    component: Reference
} as Meta;

/**
 * Base case
 */
const Template: Story<DocumentSerializedType> = (props) => {
    const document = new Document(props);
    return (
        <>
            <GlobalStyle/>
            <Reference key={document.hash} document={document} />
        </>
    )
};

/**
 * Default test case
 */
export const ASmallPlace = Template.bind({});
[ASmallPlace.args] = example.metadata.references;