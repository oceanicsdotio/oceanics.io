import React from "react";
import { Meta, StoryFn } from "@storybook/react";

const PDF_CDN_ROUTE =
  "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/johnson-etal-2019-sesf.pdf";
const DOES_NOT_EXIST = 
  "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/not-a-file.pdf";

import PDF from "./PDF";
import GlobalStyle from "../GlobalStyle";

/**
 * Storybook interface
 */
export default {
  component: PDF
} as Meta;


const Template: StoryFn<{file: string, page: number}> = (args) => {
  return (
    <>
      <GlobalStyle />
      <PDF {...args} />
    </>
  );
};

export const SinglePage = Template.bind({});
SinglePage.args = {
  page: 1,
  file: PDF_CDN_ROUTE
};
export const NotFound = Template.bind({});
NotFound.args = {
  page: 1,
  file: DOES_NOT_EXIST
};
