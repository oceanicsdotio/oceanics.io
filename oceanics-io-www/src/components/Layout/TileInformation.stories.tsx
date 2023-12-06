import React from 'react';
import TileInformation, {TileType} from './TileInformation';
import type { StoryFn, Meta } from '@storybook/react';

export default {
  component: TileInformation
} as Meta

const Template: StoryFn<TileType> = (args: TileType) => 
  <TileInformation {...args} />;

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