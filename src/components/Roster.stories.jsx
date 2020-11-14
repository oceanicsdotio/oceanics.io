import React from 'react';
import Roster  from './Roster';

export default {
  component: Roster,
  title: 'Roster',
};

const Template = args => <Roster {...args} />;


export const Vacancy = Template.bind({});
Vacancy.args = {
    capacity: 2,
    team: ["Mary Shelley"], 
    hidden: false,
    style: {color: "green"}
};

export const NoCapacity = Template.bind({});
NoCapacity.args = {
    team: ["Mary Shelley"],
    hidden: false
};

export const Full = Template.bind({});
Full.args = {
    capacity: 2,
    team: ["Mary Shelley", "HP Lovecraft"],
    hidden: false
};
