import { useEffect, useState } from "react";
import type {WorkerRef} from "../shared";

/**
 * The catalog page is like a landing page to the api.
 * 
 * Routes from here correspond to entities and 
 * collections in the graph database.
 * 
 * If access token is set in React state, use it to get the catalog index from Bathysphere
 */
export const useBathysphereApi = (server: string, worker: WorkerRef) => {

    /**
     * JavaScript Web Token. State variable returned to parent component,
     * but not setter.
     */
    const [ accessToken ] = useState("");

    /**
     * Catalog to render in frontend, set from result
     * of Web Worker.
     */
    const [ catalog ] = useState([]);

    /**
     * Query the API for index of collections.
     */
    useEffect(() => {
        if (worker.current && accessToken)
            worker.current.postMessage({
                type: "query",
                data: {server, accessToken}
            }); 

            // TODO: ).then(setCatalog)
    }, [ worker, accessToken, server ]);

    return {
        catalog,
        login: () => {},
        register: () => {}
    };
};


export default useBathysphereApi