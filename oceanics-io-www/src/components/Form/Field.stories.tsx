import React from 'react';
import {Story,Meta} from "@storybook/react";
import Field from './Field';

export default {
  component: Field
} as Meta

const Template: Story = (args) => <Field {...args} />;

export const Default = Template.bind({});
Default.args = {
    children: "Hello world"
};