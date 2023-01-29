/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import {Meta, Story} from "@storybook/react";

/**
 * Base component, w wrapped `Input` component
 */
import Campaign, {ICampaignType, PageData} from './Campaign';

 /**
  * Storybook interface
  */
 export default {
   component: Campaign
 } as Meta;
 
 /**
  * Base version
  */

const Template: Story<ICampaignType> = (args) => <Campaign {...args} />;

 /**
  * Example
  */
 export const Default = Template.bind({});
 Default.args = {
    navigate: ()=>{},
    title: PageData.title,
    campaign: PageData.campaigns[0]
 };

 