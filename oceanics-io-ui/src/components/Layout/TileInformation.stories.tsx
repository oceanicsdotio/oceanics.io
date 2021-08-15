/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import TileInformation, {TileType} from './TileInformation';

/**
 * Typescript support
 */
import { Story, Meta } from '@storybook/react';

/**
 * Storybook Interface
 */
export default {
  component: TileInformation,
  title: 'Layout/TileInformation',
} as Meta

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template: Story<TileType> = (args: TileType) => <TileInformation {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    tile: {
        publicURL: "url", 
        anchorHash: "hash",
        queryString: "",
        grayscale: false
    }, 
    query: {}
};