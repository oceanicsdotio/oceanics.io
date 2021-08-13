/**
 * React and friends
 */
 import React from 'react';

import { Meta, Story } from '@storybook/react';

 /**
  * Base component
  */
 import Article, { ArticleType } from "./Article"

 /**
  * Storybook Interface
  */
 export default {
   component: Article,
   title: 'References/Article',
 } as Meta
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template: Story<ArticleType> = (args) => <Article {...args} />;
 
 /**
  * Default test case
  */
 export const Default = Template.bind({});
 Default.args = {
    frontmatter: {
        title: "things about a thing",
        date: "whenever",
        description: "A description",
        tags: ["things", "about"],
    },
    fields: {
        slug: "/things-about-a-thing",
    },
    index: 2,
    search: "",
    onSelectValue: () => () => {}
 };