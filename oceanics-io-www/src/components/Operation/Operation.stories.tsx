import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Operation from "./Operation";
import type { OperationType } from "./Operation";
import GlobalStyle from "../GlobalStyle";

export default {
  component: Operation
} as Meta;

const Template: StoryFn<OperationType> = (args) => {
    return (
        <>
            <GlobalStyle/>
            <Operation {...args}/>
        </>
    )
};

export const Default = Template.bind({});
Default.args = {
    service: "oceanics.io",
    path: "/auth",
    method: "get",
    view: {
        body: "",
        query: ""
    },
    schema: {
        description: ["Get a JWT token"],
        summary: "Something"
    }
};
