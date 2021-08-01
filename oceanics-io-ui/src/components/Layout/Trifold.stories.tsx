/**
 * React and friends
 */
 import React from 'react';

 /**
  * Typescript support
  */
 import {Story, Meta} from "@storybook/react"

 /**
  * Base component
  */
 import Trifold, {TrifoldType} from './Trifold';

 /**
  * Color palette
  */
 import {charcoal} from "../../palette"
 
 /**
  * Storybook Interface
  */
 export default {
   component: Trifold,
   title: 'Layout/Trifold',
 } as Meta
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template: Story<TrifoldType> = (args: TrifoldType) => <Trifold {...args} />;
 
 /**
  * Default test case
  */
 export const Default = Template.bind({});
 Default.args = {
    display: undefined,
    onClick: ()=>{},
    stroke: charcoal,
 };