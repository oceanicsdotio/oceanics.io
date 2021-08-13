/**
 * React and friends
 */
 import React from 'react';
 import {Meta, Story} from "@storybook/react";
 
 /**
  * Base component, w wrapped `Input` component
  */
 import PDF, {IPDFType} from './PDF';
 
 import "../../styles/global.css";
 import "../../styles/theme.css";
 
 
  /**
   * Storybook interface
   */
  export default {
    component: PDF,
    title: 'PDF/PDF',
  } as Meta;
  
  /**
   * Base version
   */
 
 const Template: Story<IPDFType> = (args) => <PDF {...args} />;
 
 
  /**
   * Example
   */
  export const Default = Template.bind({});
  Default.args = {
     navigate: ()=>{}
  };
 
  