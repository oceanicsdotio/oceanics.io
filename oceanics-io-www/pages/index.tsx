import React from "react";
import type { GetStaticProps } from "next";

import Campaign, { PageData } from "../src/components/Campaign/Campaign";
import Oceanside from "../src/components/Oceanside";
import type {ApplicationType} from "../src/components/Oceanside";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
    ...props
}: {
    documents: any[];
    pagingIncrement: number;
} & ApplicationType) => {
    return (
        <>
            <Oceanside {...props}/>
            <Campaign
                campaign={PageData.campaigns[1]}
            />
        </>
    )
};

export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
    const {content, icons} = await import("../public/nodes.json");
    return {
        props: { 
            documents: content,
            description: "The trust layer for the blue economy",
            title: "Oceanics.io",
            pagingIncrement: 3,
            size: 96,
            grid: {
                size: 6
            },
            datum: 0.7,
            runtime: null,
            icons
        }
    }
}
