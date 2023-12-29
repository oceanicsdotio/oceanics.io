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
    id: "places-we-visited",
    url: "www.oceanics.io",
    type: "point",
    component: "Location",
    maxzoom: 20,
    minzoom: 1,
    zoomLevel: 10,
    info: "www.oceanics.io",
    onClick: ()=>{console.log("on-click")}
};

/**
 * Only visible in narrow zoom window
 */
export const Localized = Template.bind({});
Localized.args = {
    id: "favorite-dive-spots",
    url: "www.oceanics.io",
    type: "point",
    component: "Location",
    maxzoom: 8,
    minzoom: 3,
    zoomLevel: 5,
    info: "www.oceanics.io",
    onClick: ()=>{console.log("on-click")}
};

/**
 * Not currently in view
 */
export const OutOfView = Template.bind({});
OutOfView.args = {
    id: "favorite-dive-spots",
    url: "www.oceanics.io",
    type: "point",
    component: "Location",
    maxzoom: 8,
    minzoom: 3,
    zoomLevel: 10,
    info: "www.oceanics.io",
    onClick: ()=>{console.log("on-click")}
};