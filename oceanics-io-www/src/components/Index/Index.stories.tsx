import React from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Index, {IndexType} from './Index';
import GlobalStyle from "../Layout/GlobalStyle";

export default {
  component: Index
} as Meta

const Template: StoryFn<IndexType> = (args) => {
  return (
    <>
      <GlobalStyle/>
      <Index {...args}/>
    </>
  );
}

export const Default = Template.bind({});
Default.args = {
    pagingIncrement: 3,
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
