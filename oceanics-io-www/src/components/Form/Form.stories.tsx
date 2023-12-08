import React from 'react';
import type {ChangeEvent} from 'react';
import {Meta, StoryFn} from "@storybook/react"
import Form, {FormType} from './Form';
import GlobalStyle from "../Layout/GlobalStyle";

export default {
  component: Form
} as Meta

const onChange = (event: ChangeEvent<HTMLInputElement>) => {
  console.log("change-event", [event.target.id, event.target.value]);
}

const Template: StoryFn<FormType> = (args) => {
  const action = (data: FormData) => {
    console.log(Array.from(data.entries()));
  }
  return (
    <>
      <GlobalStyle/>
      <Form {...args} action={action} />
    </>
  );
}

export const Register = Template.bind({});
Register.args = {
    id: "register",
    name: "create an account",
    fields: [{
      id: "email",
      type: "email",
      placeholder: "your email address",
      required: true
    }, {
      id: "password",
      type: "password",
      placeholder: "****************",
      pattern: `.{16,64}`,
      required: true
    },{
      id: "register",
      type: "submit"
    }],
    onChange
};

export const DataInput = Template.bind({});
DataInput.args = {
    id: "post",
    name: "update parameters",
    fields: [{
      id: "name",
      type: "text"
    }, {
      id: "description",
      type: "text"
    },{
      id: "distance",
      type: "number",
      step: 0.1
    },{
      id: "post",
      type: "submit"
    }],
    onChange
};
