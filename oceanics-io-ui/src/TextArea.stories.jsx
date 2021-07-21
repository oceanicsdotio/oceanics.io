import React from 'react';

import TextArea from './TextArea';

export default {
  component: TextArea,
  title: 'Form/TextArea',
}

//👇 We create a “template” of how args map to rendering
const Template = ({}) => <TextArea>{"Some text"}</TextArea>;

//👇 Each story then reuses that template
export const Default = Template.bind({});

Default.args = {};