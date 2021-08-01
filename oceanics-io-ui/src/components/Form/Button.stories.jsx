/**
 * React and friends
 */
import React from 'react';

/**
 * Base component, w wrapped `Input` component
 */
import Button from './Button';

/**
 * Storybook interface
 */
export default {
  component: Button,
  title: 'Form/Button',
}

/**
 * Base version
 */
const Template = (args) => <Button {...args} />;

/**
 * Example
 */
export const Example = Template.bind({});
Example.args = {};