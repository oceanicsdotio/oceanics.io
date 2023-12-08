import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Index from './Index';
import type {ApplicationType} from "../Oceanside/Oceanside";
import GlobalStyle from "../GlobalStyle";

export default {
  component: Index
} as Meta

const Template: StoryFn<ApplicationType> = (args) => {
  return (
    <>
      <GlobalStyle/>
      <Index {...args}/>
    </>
  );
}

export const Default = Template.bind({});
Default.args = {
    size: 96,
    grid: {
        size: 6
    },
    datum: 0.7,
    runtime: null,
    icons: {
        sources: [],
        templates: []
    }
};
