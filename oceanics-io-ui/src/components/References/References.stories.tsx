/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import References from "./References";
import { ReferencesType } from './utils';
import PageData from "./PageData.json";

/**
 * Storybook Interface
 */
export default {
    component: References,
    title: 'References/References',
} as Meta;

const {nodes:[{frontmatter:{citations}}]} = PageData;

/**
 * Base case
 */
const Template: Story<ReferencesType> = (args) => <References {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {citations};