import React, { useCallback } from "react";
import type { GetStaticProps } from "next";

import Campaign, { PageData } from "../src/components/Campaign/Campaign";
import Oceanside from "../src/components/Oceanside";
import type {ApplicationType} from "../src/components/Oceanside"
import Index from "../src/components/References/Index";
import useMemoCache from "../src/hooks/useMemoCache";
import useNextRouter from "../src/hooks/useNextRouter";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
    documents,
    pagingIncrement,
    ...props
}: {
    documents: any[];
    pagingIncrement: number;
} & ApplicationType) => {
    /**
     * Convert into our internal Document data model. 
     */
    // const deserialized = useMemoCache(documents);

    /**
     * Just the Next router.
     */
    const {navigate, router, home} = useNextRouter();

    /**
     * Mouse event handler for paging/scroll-into-view
     */
    const onShowMore = useCallback(() => { 
        navigate("/", { items: Number(router.query.items ?? pagingIncrement) + pagingIncrement }, true) 
    }, [navigate, router, pagingIncrement]);

    /**
     * Return to default view.
     */
    const onClearConstraints = useCallback(() => {
        navigate("/", undefined, false)
    }, [navigate]);

    return (
        <>
            <Oceanside {...props}/>
            <Campaign
                campaign={PageData.campaigns[1]}
            />
            {/* <Index
                query={router.query}
                onShowMore={onShowMore}
                onClearConstraints={onClearConstraints}
                onClickLabel={home}
                documents={deserialized}
                pagingIncrement={pagingIncrement}
                navigate={navigate}
            /> */}
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
