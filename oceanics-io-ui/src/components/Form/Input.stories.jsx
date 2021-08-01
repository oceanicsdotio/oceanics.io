/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import Input from './Input';

/**
 * Storybook interface
 */
export default {
  component: Input,
  title: 'Form/Input',
}

/**
 * Base case
 */
const Template = (args) => <Input {...args} />;

export const Default = Template.bind({});
Default.args = {
    id: "generic-case",
    name: "some input",
    destructive: false,
    required: false
};

export const LongCase = Template.bind({});
LongCase.args = {
    id: "long-case",
    type: "long",
    name: "your comment",
    options: [],
    destructive: false,
    required: false
};

export const SelectCase = Template.bind({});
SelectCase.args = {
    type: "select",
    options: ["a", "b", "c"],
    id: "select-case",
    name: "your selection",
    destructive: false,
    required: false
};

export const ButtonCase = Template.bind({});
ButtonCase.args = {
    type: "button",
    options: [],
    id: "button-case",
    name: "your button",
    destructive: false,
    required: false
};