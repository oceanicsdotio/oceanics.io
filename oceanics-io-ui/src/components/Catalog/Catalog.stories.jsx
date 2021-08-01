/**
 * React and friends
 */
import React from 'react';

/**
 * Base component
 */
import Catalog from './Catalog';

import "../../styles/global.css";
import "../../styles/theme.css";

/**
 * Storybook Interface
 */
export default {
    component: Catalog,
    title: 'Catalog/Catalog',
}

/**
 * Base case
 * 
 * @param {*} args 
 * @returns 
 */
const Template = (args) => <Catalog {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    geojson: [],
    zoomLevel: 6,
    queue: [],
    setQueue: () => {},
};