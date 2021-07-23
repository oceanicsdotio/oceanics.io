import React from 'react';

import {Input} from './Input';

export default {
  component: Input,
  title: 'Form/Input',
}

const Template = (args) => <Input {...args} />;

export const Default = Template.bind({});
Default.args = {};

export const LongCase = Template.bind({});
LongCase.args = {};

export const SelectCase = Template.bind({});
SelectCase.args = {};

export const ButtonCase = Template.bind({});
ButtonCase.args = {};