import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import StyledOpenApi, {OpenApi} from "./OpenApi";
import type { IOpenApi } from "./OpenApi";
import GlobalStyle from "../GlobalStyle";

export default {
  component: OpenApi
} as Meta;

const Template: StoryFn<IOpenApi> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <StyledOpenApi {...args}/>
        </>
    )
};

export const Default = Template.bind({});
Default.args = {
    src: "/bathysphere.json"
};
