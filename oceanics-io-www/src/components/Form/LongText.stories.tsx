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
  component: LongText
} as Meta;

/**
 * Base case
 */
const Template: Story<LongTextType> = (args) => <LongText {...args} />;


export const Example = Template.bind({});
Example.args = {
    name: "your comment"
};
