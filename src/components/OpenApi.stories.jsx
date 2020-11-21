import React from 'react';
import OpenApi  from './OpenApi';

export default {
  component: OpenApi,
  title: 'OpenApi',
};

const Template = args => <OpenApi {...args} />;

export const Bivalve = Template.bind({});
Bivalve.args = {
    specUrl: "https://bivalve.oceanics.io/api.yml",
    service: "bivalve"
};