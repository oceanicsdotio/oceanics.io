import React from 'react';
import {Meta, StoryFn} from "@storybook/react";
import Select, {SelectType} from './Select';

export default {
  component: Select
} as Meta;

const Template: StoryFn<SelectType> = (args) => <Select {...args} />;

export const Example = Template.bind({});
Example.args = {
    options: ["a", "b", "c"],
    id: "select-case",
    name: "your selection",
};
