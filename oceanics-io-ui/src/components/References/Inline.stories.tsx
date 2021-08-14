/**
 * React and friends
 */
import React from 'react';
import { Meta, Story } from '@storybook/react';
/**
 * Base component
 */
import Inline from "./Inline";
import PageData from "./Index.json";
import { InlineRefType } from './utils';
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook Interface
 */
export default {
    component: Inline,
    title: 'References/Inline',
} as Meta;

const {nodes: [{frontmatter: {citations: [citation]}}]} = PageData;

/**
 * Base case
 */
const Template: Story<InlineRefType> = (args) => <Inline {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    ...citation,
    unwrap: false,
    namedAuthors: 3,
};