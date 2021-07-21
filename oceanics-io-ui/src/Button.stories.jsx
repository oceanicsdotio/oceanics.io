import React from 'react';

import Button from './Button';

export default {
  component: Button,
  title: 'Form/Button',
}

//👇 We create a “template” of how args map to rendering
const Template = (args) => <Button {...args} />;

//👇 Each story then reuses that template
export const Default = Template.bind({});

Default.args = {};