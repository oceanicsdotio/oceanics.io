import React from 'react';
import Roster  from './Roster';

export default {
  component: Roster,
  title: 'Roster',
};

const Template = args => <Roster {...args} />;

export const Example = Template.bind({});
Example.args = {
    capacity: 4,
    team: ["Mary Shelley"], 
    hidden: false,
    transferCallback: null,
    style: {color: "green"}
};