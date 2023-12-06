import React from 'react';
import {Meta, StoryFn} from "@storybook/react";
import LongText, {LongTextType} from './LongText';

export default {
  component: LongText
} as Meta;

const Template: StoryFn<LongTextType> = (args) => <LongText {...args} />;

export const Example = Template.bind({});
Example.args = {
    name: "your comment"
};
