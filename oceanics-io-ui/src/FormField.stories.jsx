import React from 'react';

import FormField from './FormField';

export default {
  component: FormField,
  title: 'Form/FormField',
}

//👇 We create a “template” of how args map to rendering
const Template = (args) => <FormField {...args} />;

//👇 Each story then reuses that template
export const Default = Template.bind({});

Default.args = {};