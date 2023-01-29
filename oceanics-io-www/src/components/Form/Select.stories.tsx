import React from 'react';
import {Meta,Story} from "@storybook/react";

/**
 * Base component
 */
import Select, {SelectType} from './Select';

/**
 * Storybook interface
 */
export default {
  component: Select
} as Meta;

/**
 * Base case
 */
const Template: Story<SelectType> = (args) => <Select {...args} />;


export const Example = Template.bind({});
Example.args = {
    options: ["a", "b", "c"],
    id: "select-case",
    name: "your selection",
};
