import React from 'react';

/**
 * Base component
 */
import StyledViewport, {ApplicationType} from './Oceanside';

import { StoryFn, Meta, Args } from '@storybook/react';

type LoaderResult = {
    loaded: {
        icons: {
            sources: unknown[]
            templates: unknown[]
        }
    }
}

const render = (
    args: Args, 
    { loaded: { icons } }: LoaderResult
) => <StyledViewport {...args} icons={icons} />

export default {
  component: StyledViewport,
  render: render
} as Meta<typeof StyledViewport>

const Template: StoryFn<ApplicationType> = (args, ) => 
    <StyledViewport {...args} />;

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