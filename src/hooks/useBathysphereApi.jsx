import { useEffect, useState, useRef } from "react";

import Worker from "./useBathysphereApi.worker.js";

/**
The catalog page is like a landing page to the api.

Routes from here correspond to entities and 
collections in the graph database.

If access token is set in React state, use it to get the catalog index from Bathysphere
*/
export default ({
    email, 
    password,
    server = "https://graph.oceanics.io"
}) => {
   
    /**
     * Catalog to render in frontend, set from result
     * of Web Worker.
     */
    const [catalog, setCatalog] = useState([]);

    /**
     * Web worker for fetching and auth
     */
    const worker = useRef(null);

    /**
     * Create worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    const [accessToken, setAccesToken] = useState("");

    /**
     * Attemp to log in once 
     */
    useEffect(()=>{
        if (worker.current)
            worker.current.login({server, email, password}).then(setAccesToken)
    }, [ worker ]);


    /**
     * Query for collections
     */
    useEffect(() => {
        if (worker.current && accessToken) return;
            worker.current.query({url: server+"/api/", accessToken}).then(setCatalog); 
    }, [ accessToken, worker ]);

    return {
        catalog,
        accessToken,
    };
};
