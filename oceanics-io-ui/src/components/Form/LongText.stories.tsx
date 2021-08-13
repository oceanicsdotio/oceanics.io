/**
 * React and friends
 */
import React from 'react';
import {Meta,Story} from "@storybook/react";
/**
 * Base component
 */
import LongText, {LongTextType} from './LongText';

/**
 * Storybook interface
 */
export default {
  component: LongText,
  title: 'Form/LongText',
} as Meta;

/**
 * Base case
 */
const Template: Story<LongTextType> = (args) => <LongText {...args} />;

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
    name: "your comment",
    options: [],
    destructive: false,
    required: false
};
