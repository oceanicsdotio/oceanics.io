/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import Thing from './Thing';

/**
 * Storybook definition
 */
export default {
  component: Thing,
  title: 'Catalog/Thing',
}

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template = (args) => <Thing {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    spec: {
        properties: {
            meters: [{
                name: "battery"
            }]
        }
    }
};