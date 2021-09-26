/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Document from "./Document";
import GlobalStyle from '../Layout/GlobalStyle';
import PageData from "./Example.json";
import type { IDocument } from './Document';

/**
 * Storybook Interface
 */
export default {
    component: Document,
    title: 'References/Document',
} as Meta

/**
 * Base case
 */
const Template: Story<IDocument> = (args) => (
    <>
        <GlobalStyle/>
        <Document {...args} >
            {"aa aaa a aaaa aaa aa aaa".repeat(100)}
        </Document>
    </>
);

const {documents: [doc]} = PageData;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    ...doc,
    onClickTag: () => () => {}
};