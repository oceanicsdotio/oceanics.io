/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import References, {ReferencesType} from "./References";
import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook Interface
 */
export default {
    component: References,
    title: 'References/References',
} as Meta

/**
 * Base case
 */
const Template: Story<ReferencesType> = (args) => <References {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    heading: "References", references: [{
        authors: ["Keeney NR", "Keeney NR"],
        year: 2000,
        title: "A blah about blah",
        journal: "Cybernetics",
        volume: "50",
        pageRange: [90, 110],
    }]
};