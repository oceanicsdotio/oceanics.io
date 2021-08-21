/**
 * React and friends
 */
import React from 'react';

import { Meta, Story } from '@storybook/react';

/**
 * Base component
 */
import Stub from "./Stub";
import PageData from  "./PageData.json";
import { ArticleType } from './utils';

/**
 * Storybook Interface
 */
export default {
    component: Stub,
    title: 'References/Stub',
} as Meta;

const {nodes:[node]} = PageData;

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template: Story<ArticleType> = (args) => <Stub {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    ...node,
    onClickTag: () => () => { }
};