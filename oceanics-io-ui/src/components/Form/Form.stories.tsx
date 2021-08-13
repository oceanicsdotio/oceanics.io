import React from 'react';
import {Meta, Story} from "@storybook/react"
import Form from './Form';

export default {
  component: Form,
  title: 'Form/Form',
} as Meta

const Template: Story = (args) => <Form {...args} />;

export const Default = Template.bind({});
Default.args = {};