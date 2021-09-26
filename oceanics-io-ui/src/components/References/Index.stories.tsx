/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Index from "./Index";
import PageData from "./Example.json";
import { IndexType } from './utils';

/**
 * Storybook Interface
 */
export default {
    component: Index,
    title: 'References/Index',
} as Meta;

const {nodes} = PageData;

/**
 * Base case
 */
const Template: Story<IndexType> = (args) => <Index {...args} />;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = { 
    data: {
        nodes
    },
    query: {
        increment:3,
        items:10,
        tag:"",
        reference:0,
    },
    onClickMore: ()=>{},
    onClickTag: ()=>()=>{}
};