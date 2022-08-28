import React from 'react';
import type { Meta, Story } from '@storybook/react';

import Stub from "./Stub";
import type {IDocumentStub} from "./Stub";
import { Document } from './types';
import GlobalStyle from '../Layout/GlobalStyle';

// Must be pre-built by `make`
import {documents} from "../../../public/dev/content.json";
const [example] = documents.filter(({slug}) => slug === "a-small-place");

/**
 * Storybook Interface
 */
export default {
    component: Stub
} as Meta;

/**
 * Base case
 */
const Template: Story<IDocumentStub> = ({document, onClickLabel}) => {
    return (
        <>
            <GlobalStyle/>
            <Stub document={document} onClickLabel={onClickLabel} />
        </>
    )
};

/**
 * Default test case
 */
export const ASmallPlace = Template.bind({});
ASmallPlace.args = {
    document: new Document(example),
    onClickLabel: () => {
        console.log("Mock mouse event handler fired")
    }
};