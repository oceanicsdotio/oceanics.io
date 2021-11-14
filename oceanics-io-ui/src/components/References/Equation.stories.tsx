/**
 * React and friends
 */
 import React from 'react';
 import {Meta, Story} from "@storybook/react";
 
 /**
  * Base component
  */
 import Equation from "./Equation";
 import GlobalStyle from '../Layout/GlobalStyle';
 import type { IEquation } from './Equation';
 
 /**
  * Storybook Interface
  */
 export default {
     component: Equation,
     title: `References/${Equation.displayName}`,
 } as Meta
 
 /**
  * Base case
  */
 const Template: Story<IEquation> = (args) => (
     <>
         <GlobalStyle/>
         <Equation {...args} />
     </>
 );
 
 /**
  * Default test case
  */
 export const Example = Template.bind({});
 Example.args = {
     text: "{\\delta x}\\over{\\delta t}"
 };