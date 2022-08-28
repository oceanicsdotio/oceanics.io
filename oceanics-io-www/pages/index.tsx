import React, { useCallback } from "react";
import { useRouter } from "next/router";
import fs from "fs";
import path from "path";
import YAML from "yaml";

/**
 * Campaign component
 */
import Campaign, { PageData } from "../src/components/Campaign/Campaign";
import Oceanside from "../src/components/Oceanside";
import type {ApplicationType} from "../src/components/Oceanside"
import Index from "../src/components/References/Index";
import type { IDocumentIndexSerialized, QueryType } from "../src/components/References/types";
import type { GetStaticProps } from "next";
import { createIndex, readIndexedDocuments } from "../src/next-util";
import useDeserialize from "../src/hooks/useDeserialize";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
    documents,
    pagingIncrement,
    ...props
}: IDocumentIndexSerialized & ApplicationType) => {
    /**
     * Convert into our internal Document data model. 
     */
    const deserialized = useDeserialize(documents);

    /**
     * Just the Next router.
     */
    const router = useRouter();

    /**
     * Use next router, and merge query parameters.
     */
    const navigate = useCallback((pathname: string, insert?: QueryType, merge = true) => {
        const query = { ...(merge ? router.query : {}), ...(insert ?? {}) }
        router.push({ pathname, query });
    }, [router]);

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

    /**
     * Additionally filter by a single label. Handles multi-word implicitly.
     */
    const onClickLabel = useCallback((label: string) => () => {
        navigate("/", {label}, true)
    }, [navigate])


    return (
        <>
            <Campaign
                campaign={PageData.campaigns[1]}
            />
            <Oceanside {...props}/>
            <Index
                query={router.query}
                onShowMore={onShowMore}
                onClearConstraints={onClearConstraints}
                onClickLabel={onClickLabel}
                documents={deserialized}
                pagingIncrement={pagingIncrement}
                navigate={navigate}
            />
        </>
    )
};

IndexPage.displayName = "Index";
export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
    const parseIconMetadata = () => {
        const file = "public/assets/oceanside.yml"
        const text = fs.readFileSync(path.join(process.cwd(), file), "utf8")
        return YAML.parseAllDocuments(text).map((doc) => doc.toJSON())
    }
    const readIcons = () => {
        const directory = "public/assets"
        return fs.readdirSync(path.join(process.cwd(), directory))
            .filter((name) => name.endsWith(".png"))
            .map((slug) => Object({ slug }))
    }
    return {
        props: { 
            documents: readIndexedDocuments(createIndex()),
            description: "The trust layer for the blue economy",
            title: "Oceanics.io",
            pagingIncrement: 3,
            size: 96,
            grid: {
                size: 6
            },
            datum: 0.7,
            runtime: null,
            icons: {
                sources: readIcons(),
                templates: parseIconMetadata()
            }
        }
    }
}
