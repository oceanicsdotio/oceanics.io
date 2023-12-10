import React from 'react';
import StyledTileInformation, {TileType, TileInformation} from './TileInformation';
import type { StoryFn, Meta } from '@storybook/react';
import GlobalStyle from '../GlobalStyle';

export default {
  component: TileInformation
} as Meta

/**
 * Something about template here
 */
const Template: StoryFn<TileType> = (args) => {
  return (
    <>
      <GlobalStyle />
      <StyledTileInformation {...args} />
    </>
  )
}
  
/**
 * Example metadata card. 
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