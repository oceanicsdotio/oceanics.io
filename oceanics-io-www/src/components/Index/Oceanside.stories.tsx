import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import Oceanside, {ApplicationType} from './Oceanside';


export default {
  component: Oceanside
} as Meta

const Template: StoryFn<ApplicationType> = (args, ) => 
    <Oceanside {...args} />;

Template.loaders = [
    async () => await fetch('/nodes.json').then(x => x.json()),
]

export const Default = Template.bind({});
Default.args = {
    size: 96,
    grid: {
        size: 6
    },
    datum: 0.7,
    runtime: null
};