/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from '@storybook/react';

/**
 * Base component
 */
import Reference from "./Reference";
import {ReferenceType} from "./utils";
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook Interface
 */
export default {
    component: Reference,
    title: 'References/Reference',
} as Meta

/**
 * Base case
 */
const Template: Story<ReferenceType> = (args) => <Reference {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    authors: ["Keeney NR", "Keeney NR"],
    year: 2000,
    title: "A blah about blah",
    journal: "Cybernetics",
    volume: "50",
    pageRange: [90, 110],
};