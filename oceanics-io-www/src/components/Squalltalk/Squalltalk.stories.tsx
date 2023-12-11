import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Squalltalk, {DEFAULT_MAP_PROPS} from './Squalltalk';
import type { ISqualltalk } from './Squalltalk';
import GlobalStyle from '../GlobalStyle';
import useDetectClient from '../../hooks/useDetectClient';

export default {
  component: Squalltalk
} as Meta;

const Template: StoryFn<ISqualltalk> = (args) => {
    const client = useDetectClient()
    return (<>
        <GlobalStyle/>
        <Squalltalk {...{...args, client}} />
    </>)
};

/**
 * An example thing, with a possible meter level.
 */
export const Default = Template.bind({});
Default.args = {
    map: {
        defaults: DEFAULT_MAP_PROPS,
        expand: true,
        accessToken: process.env.STORYBOOK_PUBLIC_MAPBOX_ACCESS_TOKEN??""
    },
    height: "500px"
};