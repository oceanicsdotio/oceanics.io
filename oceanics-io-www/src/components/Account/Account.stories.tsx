import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Account from "./Account";
import type { IAccount } from "./Account";

export default {
  component: Account
} as Meta;

const Template: StoryFn<IAccount> = (args) => <Account {...args} />;

export const ServiceAccount = Template.bind({});
ServiceAccount.args = {
  server: ""
};
