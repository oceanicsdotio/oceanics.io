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
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 0,
            gridAutoRows: "minmax(100px, auto)",
            boxSizing: "border-box"
        }}>
            <StyledCatalog {...args} />
        </div>
    </>)
}

/**
 * An example test case
 */
export const Default = Template.bind({});
Default.args = {
    channels: [],
    zoomLevel: 6,
    queue: [],
    setQueue: () => {console.log("set-queue")},
};