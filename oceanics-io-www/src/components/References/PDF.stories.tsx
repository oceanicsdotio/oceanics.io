/**
 * React and friends
 */
import React from "react";
import { Meta, Story } from "@storybook/react";

const PDF_CDN_ROUTE =
  "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/johnson-etal-2019-sesf.pdf";

import PDF from "./PDF";
import GlobalStyle from "../Layout/GlobalStyle";

/**
 * Storybook interface
 */
export default {
  component: PDF,
  title: "References/PDF",
} as Meta;

/**
 * Base version
 */

const Template: Story<void> = () => {
  return (
    <>
      <GlobalStyle />
      <PDF file={PDF_CDN_ROUTE} pages={2} />
    </>
  );
};

/**
 * Example
 */
export const Example = Template.bind({});
Example.args = {};
