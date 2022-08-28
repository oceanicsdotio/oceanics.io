import React from "react";
import { Meta, Story } from "@storybook/react";
import Account from "./Account";
import type { IAccount } from "./Account";

/**
 * Storybook interface
 */
export default {
  component: Account
} as Meta;

/**
 * Base version
 */

const Template: Story<IAccount> = (args) => <Account {...args} />;

/**
 * Example
 */
export const ServiceAccount = Template.bind({});
ServiceAccount.args = {
  server: "",
  email: "",
  password: "",
  salt: ""
};
