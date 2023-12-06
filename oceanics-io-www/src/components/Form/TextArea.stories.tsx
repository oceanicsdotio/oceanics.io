import React from 'react';
import {Meta, StoryFn} from "@storybook/react";
import TextArea from './TextArea';

export default {
  component: TextArea
} as Meta;

const Template: StoryFn = ({children}) => <TextArea>{children}</TextArea>;

export const ShortString = Template.bind({});
ShortString.args = {
    children: "Some text"
};

export const LongString = Template.bind({});
ShortString.args = {
    children: "some text ".repeat(127)
};