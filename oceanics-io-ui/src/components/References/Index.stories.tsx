/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Index from "./Index";
import PageData from "./PageData.json";
import "../../styles/global.css";
import "../../styles/theme.css";
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
        allMdx: {
            nodes,
            group: [{fieldValue: "shade"}, {fieldValue: 'data'}, {fieldValue: "things"}]
        }
    },
    query: {
        inc:3,
        items:10,
        tag:"",
        reference:0,
    },
    onChangeSelect: ()=>{},
    onClickMore: ()=>{},
    onClickTag: ()=>()=>{}
};