import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import {Standalone} from './Squalltalk';
import type { ViewParams } from './Squalltalk';
import GlobalStyle from '../GlobalStyle';

export default {
  component: Standalone
} as Meta;

const Template: StoryFn<ViewParams> = (args) => {
    return (<>
        <GlobalStyle/>
        <Standalone {...args} />
    </>)
};

/**
 * An example thing, with a possible meter level.
 */
export const Default = Template.bind({});
Default.args = {
    zoom: 3,
    center: [0, 0],
    accessToken: process.env.STORYBOOK_PUBLIC_MAPBOX_ACCESS_TOKEN
};