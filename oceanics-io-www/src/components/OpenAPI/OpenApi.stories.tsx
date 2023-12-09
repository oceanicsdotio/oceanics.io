import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import OpenApi from "./OpenApi";
import type { OpenApiType } from "./OpenApi";
import GlobalStyle from "../GlobalStyle";

export default {
  component: OpenApi
} as Meta;

const Template: StoryFn<OpenApiType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <OpenApi {...args}/>
        </>
    )
};

export const Default = Template.bind({});
Default.args = {
    src: "/bathysphere.json"
};
