import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import ShaderProvider from "./Shaders.context";
import Shaders from "./Shaders";
import type { IShaders } from "./Shaders";
import GlobalStyle from "../GlobalStyle";

export default {
  component: Shaders,
} as Meta;

const Template: StoryFn<IShaders> = (args) => {
  return (
    <>
      <GlobalStyle />
      <ShaderProvider>
        <Shaders {...args}/>
      </ShaderProvider>
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  source: {
    screen: ["quad-vertex", "screen-fragment"],
    draw: ["draw-vertex", "draw-fragment"],
    update: ["quad-vertex", "update-fragment"],
  },
};
