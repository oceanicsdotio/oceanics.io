/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import Rubric from "./Rubric"

 /**
  * Storybook Interface
  */
 export default {
   component: Rubric,
   title: 'Rubric/Rubric',
 }
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template = (args) => <Rubric {...args} />;
 
 /**
  * Default test case
  */
 export const Default = Template.bind({});
 Default.args = {
     scoreMultiplier: 1
 };