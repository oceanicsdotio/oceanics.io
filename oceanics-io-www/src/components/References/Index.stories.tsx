import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Index from "./Index";
import type { DocumentIndexType } from './Index';
import {documents} from "../../../public/dev/content.json";
import GlobalStyle from '../Layout/GlobalStyle';
import { Document } from './types';

/**
 * Storybook Interface
 */
export default {
    component: Index
} as Meta;

/**
 * Base case
 */
const Template: Story<DocumentIndexType> = (args) => (
    <>
        <GlobalStyle/>
        <Index {...args} />
    </>
);

/**
 * Default test case
 */
export const ReferenceIndex = Template.bind({});
ReferenceIndex.args = { 
    documents: documents.map((doc)=>(new Document(doc))),
    query: {
        increment: 3,
        items: 10,
        tag:"",
        reference:0,
    },
    onClickMore: ()=>{
        console.log("Mock click more mouse event handler")
    },
    onClickTag: ()=>()=>{
        console.log("Mock click tag mouse event handler")
    }
};