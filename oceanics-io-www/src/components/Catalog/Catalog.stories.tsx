/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import { Meta, Story} from "@storybook/react";

/**
 * Base component
 */
import Catalog, {CatalogType} from './Catalog';

/**
 * Storybook Interface
 */
export default {
    component: Catalog
} as Meta;

/**
 * Base case
 */
const Template: Story<CatalogType> = (args) => <Catalog {...args} />;

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