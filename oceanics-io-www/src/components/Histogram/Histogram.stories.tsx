import React from 'react';
import {Meta,StoryFn} from "@storybook/react";
import GlobalStyle from '../GlobalStyle';
import Histogram from './Histogram';
import type { IHistogram } from './useHistogram';
import { ghost } from '../../palette';

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
    data: [[0.2, 10], [0.4, 20], [0.5, 3], [0.6, 6]],
    foreground: ghost,
    caption: "Some data"
};