/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";
/**
 * Base component
 */
import TextArea from './TextArea';

/**
 * Storybook config
 */
export default {
  component: TextArea,
  title: 'Form/TextArea',
} as Meta;

/**
 * Template to build cases from
 */
const Template: Story = ({children}) => <TextArea>{children}</TextArea>;

/**
 * Case with a short string
 */
export const Short = Template.bind({});
Short.args = {
    children: "Some text"
};

/**
 * Case with a long string
 */
export const Long = Template.bind({});
Long.args = {
    children: "some text ".repeat(127)
};