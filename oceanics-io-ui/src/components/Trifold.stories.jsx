/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import Trifold from './Trifold';

 /**
  * Color palette
  */
 import {charcoal} from "./palette"
 
 /**
  * Storybook Interface
  */
 export default {
   component: Trifold,
   title: 'MapBox/Trifold',
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
    display: undefined,
    onClick: ()=>{},
    stroke: charcoal,
 };