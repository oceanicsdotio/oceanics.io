/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import type { ReactNode } from 'react';
import type { Meta, Story } from "@storybook/react";

/**
 * Base component
 */
import Document from "./Document";
import GlobalStyle from '../Layout/GlobalStyle';
import PageData from "./Example.json";
import type { IDocumentContent } from './Document';
import {Document as DocumentClass} from "./types"

/**
 * Storybook Interface
 */
export default {
    component: Document
} as Meta

/**
 * Base case
 */
const Template: Story<IDocumentContent&{children: ReactNode}> = (args) => (
    <>
        <GlobalStyle/>
        <Document {...args} >
            {"aa aaa a aaaa aaa aa aaa".repeat(100)}
        </Document>
    </>
);

const {documents: [doc]} = PageData;
const TEST_STRING = "aa aaa a aaaa aaa aa aaa";

/**
 * Test cases
 */
export const TextContent = Template.bind({});
TextContent.args = {
    document: new DocumentClass(doc),
    onClickLabel: () => {},
    children: TEST_STRING.repeat(100)
};
export const HtmlContent = Template.bind({});
HtmlContent.args = {
    document: new DocumentClass(doc),
    onClickLabel: () => {},
    children: [...Array(5)].map(() => <p>{TEST_STRING}</p>)
};