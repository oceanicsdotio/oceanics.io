/**
 * React and friends
 */
import React from 'react';
import {Meta,Story} from "@storybook/react";
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Base component
 */
import Select, {SelectType} from './Select';

/**
 * Storybook interface
 */
export default {
  component: Select,
  title: 'Form/Select',
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
