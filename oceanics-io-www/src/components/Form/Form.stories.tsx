/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Form, {FormType} from './Form';

export default {
  component: Form
} as Meta

const Template: StoryFn<FormType> = (args) => <Form {...args} />;

export const Default = Template.bind({});
Default.args = {
    id: "some-form",
    fields: [],
    actions: [],
    onChange: () => {}
};