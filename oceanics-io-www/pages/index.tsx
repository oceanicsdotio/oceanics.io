import React from "react";
import type { GetStaticProps } from "next";

import Index from "../src/components/Index/Index";
import type {ApplicationType} from "../src/components/Index/Oceanside";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
    ...props
}: {
    documents: any[];
} & ApplicationType) => {
    return <Index {...props}/>
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
