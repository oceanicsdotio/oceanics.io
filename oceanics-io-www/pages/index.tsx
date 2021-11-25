/**
 * React and friends.
 */
import React, { useCallback, useRef, useEffect, useState } from "react";
import type {FC, Dispatch, SetStateAction} from "react"
import { useRouter } from "next/router";

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


const createBathysphereWorker = () => {
    return new Worker(
        new URL("../src/workers/useBathysphereApi.worker.ts", import.meta.url)
    );
}

const createObjectStorageWorker = () => {
    return new Worker(
        new URL("../src/workers/useObjectStorage.worker.ts", import.meta.url)
    );
}

const createOpenApiLoaderWorker = () => {
    return new Worker(
        new URL("../src/workers/useOpenApiLoader.worker.ts", import.meta.url)
    );
}

const useWorkerState = (name: string) => {
    const ref = useRef<Worker|null>();
    const [messages, setMessages] = useState<String[]>([]);

    const onMessageHandler = (name: string, setValue: Dispatch<SetStateAction<any[]>>) => ({data}: any) => {
        console.log(`Message from ${name} worker:`, data);
        setValue((prev: any[]) => [...prev, data]);
    }

    const start = (worker: Worker) => {
        ref.current = worker;
        if (ref.current) {
            ref.current.addEventListener("message", onMessageHandler(name, setMessages));
            ref.current.postMessage({ type: "status" });
        } else {
            console.error(`${name} worker not ready`);
        }
        return ref.current
    }

    return {
        ref,
        messages,
        start
    }
}

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

    const bathysphereWorker = useWorkerState("bathysphereApi");
    const objectStorageWorker = useWorkerState("S3");
    const openApiWorker = useWorkerState("openApiLoader");

    const {runtime} = useWasmRuntime();

    useEffect(() => {
        if (runtime) console.log("Runtime ready")
    }, [runtime])

    useEffect(() => {
        bathysphereWorker.start(createBathysphereWorker());
    }, []);

    useEffect(() => {
        objectStorageWorker.start(createObjectStorageWorker());
    }, []);

    useEffect(() => {
        openApiWorker.start(createOpenApiLoaderWorker());
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
