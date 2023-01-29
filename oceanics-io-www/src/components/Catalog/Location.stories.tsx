/**
 * React and friends
 */
import React from 'react';
import {Meta,Story} from "@storybook/react"
/**
 * Base component
 */
import Location, {LocationType} from './Location';

/**
 * Storybook Interface
 */
export default {
    component: Location
} as Meta;

/**
 * Base case
 */
const Template: Story<LocationType> = (args) => <Location {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    key: "a-location",
    properties: {
        name: "Null Island",
        nav_unit_n: "Null Island"
    },
    coordinates: [0,0]
};