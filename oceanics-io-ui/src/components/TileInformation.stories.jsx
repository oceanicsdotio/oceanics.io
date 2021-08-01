/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import TileInformation from './TileInformation';

/**
 * Storybook Interface
 */
export default {
  component: Thing,
  title: 'Oceanside/TileInformation',
}

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template = (args) => <TileInformation {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    tile: {
        publicURL: string, 
        anchorHash: string,
        queryString: string,
        grayscale: boolean
    }, 
    className: string,
    search: string
};