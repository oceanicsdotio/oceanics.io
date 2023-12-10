import React from 'react';
import {Meta,StoryFn} from "@storybook/react";
import StyledChannel, { Channel } from './Channel';
import type { ChannelType } from './Channel';
import GlobalStyle from '../GlobalStyle';

export default {
    component: Channel
} as Meta;

const Template: StoryFn<ChannelType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <StyledChannel {...args} />
        </>
    );
}

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    id: "a-layer",
    url: "example.com",
    type: "point",
    component: "a component",
    maxzoom: 20,
    minzoom: 1,
    zoomLevel: 10,
    attribution: "Oceanics.io",
    info: null,
    onClick: ()=>{console.log("on-click")}
};