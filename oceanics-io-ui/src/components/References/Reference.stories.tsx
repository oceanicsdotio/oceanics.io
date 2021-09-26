/**
 * React and friends
 */
import React from 'react';
import type {Meta, Story} from '@storybook/react';

/**
 * Base component
 */
import Reference from "./Reference";
import GlobalStyle from "../Layout/GlobalStyle"
import type {IDocument} from "./types";
import {Document} from "./types";
import PageData from "./Example.json";

/**
 * Storybook Interface
 */
export default {
    component: Reference,
    title: 'References/Reference',
} as Meta;

const {documents: [{metadata: {references: [doc]}}]} = PageData;

/**
 * Base case
 */
const Template: Story<IDocument> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Reference {...args} />
        </>
    )
};

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    document: new Document(doc)
};