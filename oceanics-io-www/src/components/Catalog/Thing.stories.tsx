/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react"
/**
 * Base component
 */
import Thing, {ThingType} from './Thing';

/**
 * Storybook definition
 */
export default {
  component: Thing,
  title: 'Catalog/Thing',
} as Meta;

/**
 * Base case
 */
const Template: Story<ThingType> = (args) => <Thing {...args} />;

/**
 * Default test case
 */
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