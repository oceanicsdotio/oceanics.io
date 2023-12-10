import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Account from "./Account";
import type { IAccount } from "./Account";


export default {
  component: Account
} as Meta;


const Template: StoryFn<IAccount> = (args) => <Account {...args} />;

/**
 * Show the registration form if account is not assumed
 * to exist.
 */
export const Register = Template.bind({});
Register.args = {
  exists: false,
  name: "create an account"
};

/**
 * Show login form if the account is assumed to exist. 
 */
export const Login = Template.bind({});
Login.args = {
  exists: true,
  name: "login"
};