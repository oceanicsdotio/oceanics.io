/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import TextArea from './TextArea';

/**
 * Global styles
 */
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook config
 */
export default {
  component: TextArea,
  title: 'Form/TextArea',
}

/**
 * Template to build cases from
 */
const Template = ({children}) => <TextArea>{children}</TextArea>;

/**
 * Case with a short string
 */
export const Short = Template.bind({});
Short.args = {
    children: "Some text"
};

/**
 * Case with a long string
 */
export const Long = Template.bind({});
Long.args = {
    children: "some text ".repeat(127)
};