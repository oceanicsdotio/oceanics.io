import React from 'react';
import Agent, {StyledAgent} from './Agent';

export default {
  component: Agent,
  subComponents: {StyledAgent},
  title: 'Agent',
};

const Template = args => <Agent {...args} />;

export const Example = Template.bind({});
Example.args = {
    name: "Mary Shelley"
};