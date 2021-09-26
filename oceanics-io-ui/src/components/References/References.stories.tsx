/**
 * React and friends
 */
import React from 'react';
import type {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import References from "./References";
import type { ReferencesType } from './utils';
import PageData from "./Example.json";

/**
 * Storybook Interface
 */
export default {
    component: References,
    title: 'References/References',
} as Meta;

const {nodes:[{data:{citations}}]} = PageData;

/**
 * Base case
 */
const Template: Story<ReferencesType> = (args) => <References {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {citations};