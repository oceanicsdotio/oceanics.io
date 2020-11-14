import React from 'react';
import References  from './References';

export default {
  component: References,
  title: 'References',
};

const Template = args => <References {...args} />;

export const Example = Template.bind({});
Example.args = {
    references: [{
        authors: ["Audet D", "Miron G", "Moriyasu M"],
        year: 2008,
        title: "Biological characteristics of a newly established green crab (Carcinus maenas) population in the Southern Gulf of St. Lawrence, Canada",
        journal: "Journal of Shellfish Research",
        volume: "27",
        pageRange: [427, 441]
    }]
};