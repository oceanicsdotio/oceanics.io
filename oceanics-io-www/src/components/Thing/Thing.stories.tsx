import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import StyledThing, {Thing} from './Thing';
import type { ThingType } from './Thing';
import GlobalStyle from '../GlobalStyle';

export default {
  component: Thing
} as Meta;

const Template: StoryFn<ThingType> = (args) => {
    return (<>
        <GlobalStyle/>
        <StyledThing {...args} />
    </>)
};

export const Default = Template.bind({});
Default.args = {
    spec: {
        name: "weather station",
        properties: {
            meters: [{
                name: "battery",
                min: 0,
                max: 100,
                value: 80
            }]
        }
    }
};