import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Location, {LocationType} from './Location';

export default {
    component: Location
} as Meta;

const Template: StoryFn<LocationType> = (args) => <Location {...args} />;

export const Default = Template.bind({});
Default.args = {
    key: "a-location",
    properties: {
        name: "Null Island",
        nav_unit_n: "Null Island"
    },
    coordinates: [0,0]
};