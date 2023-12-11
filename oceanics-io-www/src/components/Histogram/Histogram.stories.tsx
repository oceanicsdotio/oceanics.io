import React from 'react';
import {Meta,StoryFn} from "@storybook/react";
import GlobalStyle from '../GlobalStyle';
import Histogram from './Histogram';
import type { IHistogram } from './useHistogram';

export default {
    component: Histogram
} as Meta;

const Template: StoryFn<IHistogram> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Histogram {...args} />
        </>
    );
}

/**
 * Default test case
 */
export const EmptyArgs = Template.bind({});
EmptyArgs.args = {

};