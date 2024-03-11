import React from 'react';
import {Meta,StoryFn} from "@storybook/react";
import GlobalStyle from '../GlobalStyle';
import DataStream from './DataStream';
import type { IDataStream } from './useDataStream';
import { orange, ghost } from '../../palette';

export default {
    component: DataStream
} as Meta;

const Template: StoryFn<IDataStream> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <DataStream {...args} />
        </>
    );
}

/**
 * Default test case
 */
export const EmptyArgs = Template.bind({});
EmptyArgs.args = {
    streamColor: orange,
    overlayColor: ghost,
    backgroundColor: "#202020FF",
    lineWidth: 1.5,
    pointSize: 2.0,
    capacity: 500,
    tickSize: 10.0,
    fontSize: 12.0,
    labelPadding: 2.0,
};