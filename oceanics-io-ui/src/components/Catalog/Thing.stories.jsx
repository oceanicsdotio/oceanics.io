import React from 'react';

import Thing from './Thing';

export default {
  component: Thing,
  title: 'SensorThings/Thing',
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