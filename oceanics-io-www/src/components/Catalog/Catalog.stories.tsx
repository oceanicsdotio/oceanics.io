import React from 'react';
import { Meta, StoryFn} from "@storybook/react";
import StyledCatalog, {Catalog} from './Catalog';
import type { CatalogType } from './Catalog';


export default {
    component: Catalog
} as Meta;

const Template: StoryFn<CatalogType> = (args) => {
    return (<>
        <StyledCatalog {...args} />;
    </>)
}

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