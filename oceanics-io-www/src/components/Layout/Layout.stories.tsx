/**
 * React and friends
 */
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
  component: Layout,
  title: 'Layout/Layout',
} as Meta

/**
 * Base case
 *
 */
const Template: Story<ILayout> = (args) => <Layout {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    ...PageData
};