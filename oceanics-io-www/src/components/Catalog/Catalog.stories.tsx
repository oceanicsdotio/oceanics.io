import React from 'react';
import { Meta, StoryFn} from "@storybook/react";
import StyledCatalog, {Catalog} from './Catalog';
import type { CatalogType } from './Catalog';
import GlobalStyle from '../GlobalStyle';


export default {
    component: Catalog
} as Meta;

const Template: StoryFn<CatalogType> = (args) => {
    return (<>
        <GlobalStyle/>
        <StyledCatalog {...args} />;
    </>)
}

/**
 * An example test case
 */
export const Default = Template.bind({});
Default.args = {
    geojson: [],
    zoomLevel: 6,
    queue: [],
    setQueue: () => {console.log("set-queue")},
};