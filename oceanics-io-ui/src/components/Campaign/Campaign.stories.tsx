/**
 * React and friends
 */
import React from 'react';

 /**
  * Base component, w wrapped `Input` component
  */
import Campaign, {CampaignType} from './Campaign';
 
 /**
  * Storybook interface
  */
 export default {
   component: Campaign,
   title: 'index/Campaign',
 }
 
 /**
  * Base version
  */
 const Template = (args: CampaignType) => <Campaign {...args} />;
 
 /**
  * Example
  */
 export const Example = Template.bind({});
 Example.args = {};