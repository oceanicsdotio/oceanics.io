/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import Layout, {LayoutType} from './Layout';

/**
 * Load static data
 */
// @ts-ignore
import LayoutData from "js-yaml-loader!./layout.yml"

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
 * @param {*} args 
 * @returns 
 */
const Template: Story<LayoutType> = (args: LayoutType) => <Layout {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    ...LayoutData
};