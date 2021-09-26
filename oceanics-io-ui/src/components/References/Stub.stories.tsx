/**
 * React and friends
 */
import React from 'react';
import type { Meta, Story } from '@storybook/react';

/**
 * Base component
 */
import Stub from "./Stub";
import type {IDocument} from "./types";
import { Document } from './types';
import PageData from  "./Example.json";
import GlobalStyle from '../Layout/GlobalStyle';

/**
 * Storybook Interface
 */
export default {
    component: Stub,
    title: 'References/Stub',
} as Meta;

const {documents:[node]} = PageData;

/**
 * Base case
 */
const Template: Story<IDocument> = (args) => (
    <>
        <GlobalStyle/>
        <Stub {...args} />
    </>
);

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    document: new Document({metadata: node})
};