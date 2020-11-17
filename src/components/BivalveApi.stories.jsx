import React from 'react';
import BivalveApi  from './BivalveApi';

export default {
  component: BivalveApi,
  title: 'BivalveApi',
};

const Template = args => <BivalveApi {...args} />;

export const Example = Template.bind({});
Example.args = {
};