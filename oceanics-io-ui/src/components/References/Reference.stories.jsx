/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import Reference from "./Reference"

 /**
  * Storybook Interface
  */
 export default {
   component: Reference,
   title: 'References/Reference',
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