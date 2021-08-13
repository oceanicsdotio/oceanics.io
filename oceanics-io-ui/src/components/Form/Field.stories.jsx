import React from 'react';

import Field from './Field';

export default {
  component: Field,
  title: 'Form/Field',
}

const Template = (args) => <Field {...args} />;

export const Default = Template.bind({});
Default.args = {};