import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import Layout, {ILayout} from './Layout';
import PageData from "./PageData.json";

export default {
  component: Layout
} as Meta

const Template: StoryFn<ILayout> = (args) => <Layout {...args} />;

export const Default = Template.bind({});
Default.args = {
    ...PageData
};