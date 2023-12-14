import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import Simulation from './Simulation';
import type { ISimulation } from './useSimulation';
import GlobalStyle from '../GlobalStyle';

export default {
  component: Simulation
} as Meta

const Template: StoryFn<ISimulation> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Simulation {...args} />
        </>
    )
}

export const Default = Template.bind({});
Default.args = {

    
};
