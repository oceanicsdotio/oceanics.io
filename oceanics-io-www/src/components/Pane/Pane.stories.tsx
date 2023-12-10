import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Pane from "./Pane";
import type { PaneType } from "./Pane";
import GlobalStyle from "../GlobalStyle";

export default {
  component: Pane
} as Meta;

const Template: StoryFn<PaneType> = () => {
    const first = {
        row: 0,
        column: 0,
        expand: true,
        mobile: false
    }
    const second = {
        row: 0,
        column: 1,
        expand: true,
        mobile: false
    }
    return (
        <>
            <GlobalStyle/>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 0,
                gridAutoRows: "minmax(100px, auto)",
                boxSizing: "border-box"
            }}>
                
                <Pane {...first}>first</Pane>
                <Pane {...second}>second</Pane>
            </div>
        </>
    )
};

/**
 * Show two panes
 */
export const Default = Template.bind({});
Default.args = {};
