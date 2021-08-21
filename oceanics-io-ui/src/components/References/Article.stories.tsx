/**
 * React and friends
 */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Article from "./Article";
import PageData from "./PageData.json";
import { ArticleType } from './utils';

/**
 * Storybook Interface
 */
export default {
    component: Article,
    title: 'References/Article',
} as Meta

/**
 * Base case
 */
const Template: Story<ArticleType> = (args) => <Article {...args} >
        {"aa aaa a aaaa aaa aa aaa".repeat(100)}
    </Article>;

const {nodes: [node]} = PageData;

/**
 * Default test case
 */
export const Example = Template.bind({});
Example.args = {
    ...node,
    onClickTag: () => () => {}
};