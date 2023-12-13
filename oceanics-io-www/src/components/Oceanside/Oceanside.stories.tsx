import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import StyledOceanside, {Oceanside} from './Oceanside';
import type { ApplicationType } from './Oceanside';
import GlobalStyle from '../GlobalStyle';

export default {
  component: Oceanside
} as Meta

const Template: StoryFn<ApplicationType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <StyledOceanside {...args} />
        </>
    )
}

/**
 * Show an 8x8 animated grid.
 */
export const EightSquare = Template.bind({});
EightSquare.args = {
    view: {
        size: 512
    },
    size: 8,
    grid: {
        size: 8
    },
    datum: 0.6,
    runtime: null,
    src: "/nodes.json"
};

/**
 * Show an 12x12 animated grid, to demonstrate performance limits.
 */
export const TwelveSquare = Template.bind({});
TwelveSquare.args = {
    view: {
        size: 512
    },
    size: 12,
    grid: {
        size: 12
    },
    datum: 0.6,
    runtime: null,
    src: "/nodes.json"
};