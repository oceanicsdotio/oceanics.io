/**
 * React and friends
 */
import React from 'react';
import { Meta, Story } from '@storybook/react';
/**
 * Base component
 */
import Inline from "./Inline";
import PageData from "./Example.json";
import type { IInline } from './Inline';
import GlobalStyle from '../Layout/GlobalStyle';
import { Document } from './types';

/**
 * Storybook Interface
 */
export default {
    component: Inline,
    title: 'References/Inline',
} as Meta;

const {documents: [{metadata: {references: [doc]}}]} = PageData;

/**
 * Base case
 */
const Template: Story<IInline> = (args) => (
    <>
        <GlobalStyle/>
        <Inline {...args} />
    </>
);

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    document: new Document(doc),
    parenthesis: false
};