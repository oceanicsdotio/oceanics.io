import React from 'react';
import Person, {StyledPerson} from './Person';

export default {
  component: Person,
  subComponents: {StyledPerson},
  title: 'Person',
};

const Template = args => <Person {...args} />;

export const Example = Template.bind({});
Example.args = {
    name: "Mary Shelley"
};