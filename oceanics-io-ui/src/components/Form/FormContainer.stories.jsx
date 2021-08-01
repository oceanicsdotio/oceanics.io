import React from 'react';

import FormContainer from './FormContainer';

export default {
  component: Form,
  title: 'Form/FormContainer',
}

const Template = (args) => <FormContainer {...args} />;

export const Default = Template.bind({});

Default.args = {};