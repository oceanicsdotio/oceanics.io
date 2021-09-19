/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from '@storybook/react';

/**
 * Base component
 */
import Reference from "./Reference";
import GlobalStyle from "../Layout/GlobalStyle"
import type {ReferenceType} from "./utils";
import PageData from "./PageData.json";

/**
 * Storybook Interface
 */
export default {
    component: Reference,
    title: 'References/Reference',
} as Meta;

const {nodes: [{frontmatter: {citations: [citation]}}]} = PageData;

/**
 * Base case
 */
const Template: Story<ReferenceType> = (args) => {
    return (
        <>
        <GlobalStyle/>
        <Reference {...args} />
        </>
    )
};

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = citation;