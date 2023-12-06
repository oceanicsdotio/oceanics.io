import React from 'react';
import {StoryFn, Meta} from "@storybook/react";
import Button from './Button';

export default {
  component: Button
} as Meta

const Template: StoryFn = (args) => <Button {...args} />;

export const Example = Template.bind({});
Example.args = {
    id: "some-button",
    children: "your button",
    onClick: ()=>{},
};