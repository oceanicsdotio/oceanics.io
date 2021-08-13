import React from 'react';
import {Story,Meta} from "@storybook/react";
import Field from './Field';

export default {
  component: Field,
  title: 'Form/Field',
} as Meta

const Template: Story = (args) => <Field {...args} />;

export const Default = Template.bind({});
Default.args = {};