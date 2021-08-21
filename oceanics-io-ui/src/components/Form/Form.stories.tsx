import React from 'react';
import {Meta, Story} from "@storybook/react"
import Form, {FormType} from './Form';

export default {
  component: Form,
  title: 'Form/Form',
} as Meta

const Template: Story<FormType> = (args) => <Form {...args} />;

export const Default = Template.bind({});
Default.args = {
    id: "some-form",
    fields: [],
    actions: [],
    onChange: () => {}
};