/**
 * React and friends
 */
import React from 'react';
import type { Meta, Story } from '@storybook/react';

/**
 * Base component
 */
import Stub from "./Stub";
import PageData from  "./Example.json";
import type { ArticleType } from './utils';

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