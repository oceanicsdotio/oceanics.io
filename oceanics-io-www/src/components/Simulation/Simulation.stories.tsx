import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Simulation from "./Simulation";
import type { ISimulation } from "./useSimulation";
import ShaderProvider from "../Shaders/Shaders.context";
import GlobalStyle from "../GlobalStyle";

export default {
  component: Simulation,
} as Meta;

const Template: StoryFn<ISimulation> = (args) => {
  return (
    <>
      <GlobalStyle />
      <ShaderProvider>
        <Simulation {...args} />
      </ShaderProvider>
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  velocity: {
    source:
      "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.png",
    metadataFile:
      "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.json",
  },
};
