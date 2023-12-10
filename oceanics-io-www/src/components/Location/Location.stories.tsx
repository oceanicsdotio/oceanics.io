import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Location, {LocationType} from './Location';
import GlobalStyle from '../GlobalStyle';

export default {
    component: Location
} as Meta;

const Template: StoryFn<LocationType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Location {...args} />
        </>
    )
};

/**
 * An example of rendering Location
 */
export const Default = Template.bind({});
Default.args = {
    key: "a-location",
    properties: {
        name: "Null Island"
    },
    coordinates: [0, 0],
    tile: {
        publicURL: "/assets/boat.gif", 
        anchorHash: "hash",
        queryString: "",
        grayscale: false
    }, 
    query: {}
};