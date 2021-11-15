/**
 * React and friends
 */
import React from 'react';
import {Meta,Story} from "@storybook/react";

/**
 * Base component
 */
import LayerCard, { LayerType } from './Channel';

/**
 * Storybook Interface
 */
export default {
    component: LayerCard,
    title: 'Catalog/LayerCard',
} as Meta;

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template: Story<LayerType> = (args) => <LayerCard {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    id: "a-layer",
    url: "example.com",
    type: "point",
    component: "a component",
    maxzoom: 20,
    minzoom: 1,
    zoomLevel: 10,
    attribution: "Oceanics.io",
    info: null,
    onClick: ()=>{}
};