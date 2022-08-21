/**
 * React and friends
 */
import React from "react";
import { Meta, Story } from "@storybook/react";
import Account from "./Account";

/**
 * Storybook interface
 */
export default {
  component: Account,
  title: `account/${Account.name}`,
} as Meta;

/**
 * Base version
 */

const Template: Story<any> = (args) => <Account {...args} />;

/**
 * Example
 */
export const Default = Template.bind({});
Default.args = {
  server: `http://localhost:8888`
};
