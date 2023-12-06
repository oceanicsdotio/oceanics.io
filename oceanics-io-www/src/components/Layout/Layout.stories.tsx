import React from 'react';

/**
 * Base component
 */
import Layout, {ILayout} from './Layout';
import PageData from "./PageData.json";

/**
 * Typescript support
 */
import { Story, Meta } from '@storybook/react';

/**
 * Storybook Interface
 */
export default {
  component: Layout
} as Meta

const Template: Story<ILayout> = (args) => <Layout {...args} />;

export const Default = Template.bind({});
Default.args = {
    ...PageData
};