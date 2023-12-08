import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Equation from "./Equation";
import GlobalStyle from "../GlobalStyle";
import type { IEquation } from "./Equation";

export default {
  component: Equation
} as Meta;

/**
 * Base case
 */
const Template: StoryFn<IEquation> = (args) => (
  <>
    <GlobalStyle />
    <Equation {...args} />
  </>
);


export const PartialDerivative = Template.bind({});
PartialDerivative.args = {
  text: "{\\delta x}\\over{\\delta t}",
};
