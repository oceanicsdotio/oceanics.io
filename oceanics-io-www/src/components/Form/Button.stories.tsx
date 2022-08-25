/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import {Story, Meta} from "@storybook/react";

/**
 * Base component, w wrapped `Input` component
 */
import Button from './Button';

/**
 * Storybook interface
 */
export default {
  component: Button,
  title: 'Form/Button',
} as Meta

/**
 * Base version
 */
const Template: Story = (args) => <Button {...args} />;

/**
 * Example
 */
export const Example = Template.bind({});
Example.args = {
    id: "some-button",
    children: "your button",
    onClick: ()=>{},
};