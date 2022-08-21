/**
 * React and friends
 */
import React from "react";
import { Meta, Story } from "@storybook/react";
import Account from "./Account";
import type { IAccount } from "./Account";

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

const Template: Story<IAccount> = (args) => <Account {...args} />;

/**
 * Example
 */
export const ServiceAccount = Template.bind({});
ServiceAccount.args = {
  server: "",
  email: "public@oceanics.io",
  password: "haug2RISH1narn.fonk",
  salt: "some_secret"
};
