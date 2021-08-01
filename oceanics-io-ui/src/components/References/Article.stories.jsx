/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import Article from "./Article"

 /**
  * Storybook Interface
  */
 export default {
   component: Article,
   title: 'References/Article',
 }
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template = (args) => <Trifold {...args} />;
 
 /**
  * Default test case
  */
 export const Default = Template.bind({});
 Default.args = {
 };