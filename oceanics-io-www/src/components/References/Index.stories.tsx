/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Index from "./Index";
import type { DocumentIndexType } from './Index';
import PageData from "./Example.json";
import GlobalStyle from '../Layout/GlobalStyle';
import { Document } from './types';

/**
 * Storybook Interface
 */
export default {
    component: Index,
    title: 'References/Index',
} as Meta;

const {documents} = PageData;

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
export const Example = Template.bind({});
Example.args = { 
    documents: documents.map((doc)=>(new Document(doc))),
    query: {
        increment:3,
        items:10,
        tag:"",
        reference:0,
    },
    onClickMore: ()=>{},
    onClickTag: ()=>()=>{}
};