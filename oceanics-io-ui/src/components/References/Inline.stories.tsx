/**
 * React and friends
 */
import React from 'react';
import { Meta, Story } from '@storybook/react';
/**
 * Base component
 */
import Inline, {InlineRefType} from "./Inline";
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook Interface
 */
export default {
    component: Inline,
    title: 'References/Inline',
} as Meta

/**
 * Base case
 */
const Template: Story<InlineRefType> = (args) => <Inline {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    authors: ["Keeney NR", "Keeney NR", "Keeney NR", "Keeney NR"],
    year: 2000,
    title: "A blah about blah",
    unwrap: false,
    namedAuthors: 3
};