/**
 * React and friends.
 */
import React, { useCallback, useRef, useEffect, useState } from "react";
import type {FC} from "react"
import { useRouter } from "next/router";
import path from "path";

/**
 * Campaign component
 */
import Campaign, { PageData } from "oceanics-io-ui/build/components/Campaign/Campaign";
import Index from "oceanics-io-ui/build/components/References/Index";
import type { IDocumentIndexSerialized, QueryType } from "oceanics-io-ui/build/components/References/types";
import type { GetStaticProps } from "next";
import { createIndex, readIndexedDocuments } from "../src/next-util";
import useDeserialize from "oceanics-io-ui/build/hooks/useDeserialize";
import useWasmRuntime from "../src/hooks/useWasmRuntime";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage: FC<IDocumentIndexSerialized> = ({
    documents,
    pagingIncrement
}) => {
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
    const navigate = useCallback((pathname: string, insert?: QueryType, merge: boolean = true) => {
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

    const wasmWorkerRef = useRef<Worker | null>();
    const tsWorkerRef = useRef<Worker | null>();

    const [wasmWorkerMessages, setWasmWorkerMessages] = useState<String[]>([]);
    const [tsWorkerMessages, setTsWorkerMessages] = useState<String[]>([]);
    const {runtime} = useWasmRuntime(path.relative("../rust/pkg"));

    useEffect(() => {
        if (runtime) console.log("Runtime ready")
    }, [runtime])

    useEffect(() => {
        // From https://webpack.js.org/guides/web-workers/#syntax
        wasmWorkerRef.current = new Worker(
        new URL('../src/useBathysphereApi.worker.ts', import.meta.url)
        );
        tsWorkerRef.current = new Worker(
        new URL('../src/ts.worker.ts', import.meta.url)
        );

        wasmWorkerRef.current.addEventListener('message', (evt) => {
        console.log('Message from wasm worker:', evt.data);
        const newMessages = [...wasmWorkerMessages, evt.data];
        setWasmWorkerMessages(newMessages);
        });

        tsWorkerRef.current.addEventListener('message', (evt) => {
        console.log('Message from TS worker:', evt.data);
        const newMessages = [...tsWorkerMessages, evt.data];
        setTsWorkerMessages(newMessages);
        });

        wasmWorkerRef.current.postMessage({ type: 'start' });
        tsWorkerRef.current.postMessage({ type: 'start' });
    }, []);

    return (
        <>
            <img src={"/shrimpers-web.png"} alt={"agents at rest"} width={"100%"} />
            <Campaign
                navigate={navigate}
                title={PageData.title}
                campaign={PageData.campaigns[1]}
            />
            <Index
                query={router.query}
                onShowMore={onShowMore}
                onClearConstraints={onClearConstraints}
                onClickLabel={onClickLabel}
                documents={deserialized}
                pagingIncrement={pagingIncrement}
            />
        </>
    )
};

IndexPage.displayName = "Index";
export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
    return {
        props: { 
            documents: readIndexedDocuments(createIndex()),
            description: "The trust layer for the blue economy",
            title: "Oceanics.io",
            pagingIncrement: 3
        }
    }
}
