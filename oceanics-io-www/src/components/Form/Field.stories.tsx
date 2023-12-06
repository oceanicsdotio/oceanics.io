import React from 'react';
import {StoryFn ,Meta} from "@storybook/react";
import Field from './Field';

export default {
  component: Field
} as Meta

const Template: StoryFn = (args) => <Field {...args} />;

export const Default = Template.bind({});
Default.args = {
    children: "Hello world"
};