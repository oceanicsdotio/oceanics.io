import React from 'react';
import { Meta, StoryFn} from "@storybook/react";
import Catalog, {CatalogType} from './Catalog';


export default {
    component: Catalog
} as Meta;

const Template: StoryFn<CatalogType> = (args) => <Catalog {...args} />;

/**
 * Default test case
 */
export const Default = Template.bind({});
Default.args = {
    geojson: [],
    zoomLevel: 6,
    queue: [],
    setQueue: () => {console.log("set-queue")},
};