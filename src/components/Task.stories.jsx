// src/components/Task.stories.js

import React from 'react';
import Task, {TaskList} from './Task';

export default {
  component: TaskList,
  subcomponents: {Task},
  title: 'TaskList',
};

const Template = args => <TaskList {...args} />;

export const Default = Template.bind({});
Default.args = {
  task: 'Test Task'
};

// export const Pinned = Template.bind({});
// Pinned.args = {
//   task: {
//     ...Default.args.task,
//     state: 'TASK_PINNED',
//   },
// };

// export const Archived = Template.bind({});
// Archived.args = {
//   task: {
//     ...Default.args.task,
//     state: 'TASK_ARCHIVED',
//   },
// };