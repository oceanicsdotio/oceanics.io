import React from 'react';
import { Meta, Story } from '@storybook/react';
/**
 * Base component
 */
import Inline from "./Inline";
import type { IInline } from './Inline';
import GlobalStyle from '../Layout/GlobalStyle';
import { Document } from 'oceanics-io-www-wasm';


import {documents} from "../../../public/dev/content.json";
const [example] = documents.filter(({slug}) => slug === "a-small-place");

/**
 * Storybook Interface
 */
export default {
    component: Inline
} as Meta;


/**
 * Base case
 */
const Template: Story<IInline> = (args) => (
    <>
        <GlobalStyle/>
        <Inline {...args} />
    </>
);

/**
 * Default test case
 */
export const ASmallPlace = Template.bind({});
ASmallPlace.args = {
    document: new Document(example.metadata.references[0]),
    parenthesis: false
};