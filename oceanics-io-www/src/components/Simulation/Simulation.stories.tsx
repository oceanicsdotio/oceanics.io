import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import Simulation from './Simulation';
import type { ApplicationType } from './Simulation';
import GlobalStyle from '../GlobalStyle';

export default {
  component: Simulation
} as Meta

const Template: StoryFn<ApplicationType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Simulation {...args} />
        </>
    )
}

export const Default = Template.bind({});
Default.args = {};
