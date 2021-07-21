import React from 'react';

import FormContainer from './FormContainer';

export default {
  component: Form,
  title: 'Form/FormContainer',
}

//👇 We create a “template” of how args map to rendering
const Template = (args) => <FormContainer {...args} />;

//👇 Each story then reuses that template
export const Default = Template.bind({});

Default.args = {};