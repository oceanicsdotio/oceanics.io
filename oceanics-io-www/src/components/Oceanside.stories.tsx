import React from 'react';

/**
 * Base component
 */
import StyledViewport, {ApplicationType} from './Oceanside';

import { StoryFn, Meta } from '@storybook/react';

import {icons} from "../../public/nodes.json";


/**
 * Storybook Interface
 */
export default {
  component: StyledViewport
} as Meta

const Template: StoryFn<ApplicationType> = (args) => 
    <StyledViewport {...args} />;

export const Default = Template.bind({});
Default.args = {
    size: 96,
    grid: {
        size: 6
    },
    datum: 0.7,
    runtime: null,
    icons
};