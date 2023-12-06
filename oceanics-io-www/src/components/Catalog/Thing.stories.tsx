import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Thing, {ThingType} from './Thing';

export default {
  component: Thing
} as Meta;

const Template: StoryFn<ThingType> = (args) => <Thing {...args} />;

export const Default = Template.bind({});
Default.args = {
    spec: {
        name: "Observer X",
        properties: {
            meters: [{
                name: "battery"
            }]
        }
    }
};