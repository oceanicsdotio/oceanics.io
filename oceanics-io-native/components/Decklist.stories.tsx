import * as React from 'react';
// import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
// import { action } from '@storybook/addon-actions';
import Decklist from './Decklist';

export const actions = {
//   onPinTask: action('onPinTask'),
//   onArchiveTask: action('onArchiveTask'),
};
storiesOf('Task', module)
//   .addDecorator(story => <View style={styles.TaskBox}>{story()}</View>)
  .add('default', () => <Decklist {...{}} />)
//   .add('pinned', () => <Task task={{ ...task, state: 'TASK_PINNED' }} {...actions} />)
//   .add('archived', () => <Task task={{ ...task, state: 'TASK_ARCHIVED' }} {...actions} />);