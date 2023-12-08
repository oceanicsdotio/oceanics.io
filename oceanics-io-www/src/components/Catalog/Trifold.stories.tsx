import React from 'react';
import {StoryFn, Meta} from "@storybook/react"
import Trifold, {TrifoldType} from './Trifold';
import {orange} from "../../palette"
 
export default {
  component: Trifold
} as Meta
 
const Template: StoryFn<TrifoldType> = (args: TrifoldType) => 
  <Trifold {...args} />;

export const Default = Template.bind({});
Default.args = {
  display: undefined,
  onClick: ()=>{},
  stroke: orange,
};