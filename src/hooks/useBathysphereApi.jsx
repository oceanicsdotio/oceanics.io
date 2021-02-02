import { useEffect, useState, useRef } from "react";

import Worker from "./useBathysphereApi.worker.js";

/**
 * The catalog page is like a landing page to the api.
 * 
 * Routes from here correspond to entities and 
 * collections in the graph database.
 * 
 * If access token is set in React state, use it to get the catalog index from Bathysphere
 */
export default ({
    email, 
    password,
    server = "https://graph.oceanics.io"
}) => {

    /**
     * Web worker reference for fetching and auth.
     */
    const worker = useRef(null);

    /**
     * Create worker. Must be inside Hook, or webpack will protest.
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * JavaScript Web Token. State variable returned to parent component,
     * but not setter.
     */
    const [ accessToken, setAccessToken ] = useState("");

    /**
     * Attempt to log in once worker loads.
     */
    useEffect(()=>{
        if (worker.current)
            worker.current.login({server, email, password}).then(setAccessToken);
    }, [ worker ]);

    /**
     * Catalog to render in frontend, set from result
     * of Web Worker.
     */
    const [ catalog, setCatalog ] = useState([]);

    /**
     * Query the API for index of collections.
     */
    useEffect(() => {
        if (worker.current && accessToken)
            worker.current.query({server, accessToken}).then(setCatalog); 
    }, [ worker, accessToken ]);

    return {
        catalog,
        accessToken,
    };
};
