import React from 'react';

import Form from './Form';

export default {
  component: Form,
  title: 'Form/Form',
}

//👇 We create a “template” of how args map to rendering
const Template = (args) => <Form {...args} />;

//👇 Each story then reuses that template
export const Default = Template.bind({});

Default.args = {};