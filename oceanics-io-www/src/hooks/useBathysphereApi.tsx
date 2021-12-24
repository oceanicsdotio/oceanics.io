import { useEffect, useState, useReducer } from "react";
import type {WorkerRef} from "../utils";

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
    const [ accessToken, setAccessToken ] = useState("");

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
            worker.current.postMessage({
                type: "query",
                data: {server, accessToken}
            }); 

            // TODO: ).then(setCatalog)
    }, [ worker, accessToken, server ]);

    
    /**
     * The login container handles authorization interactions with the
     * backend.
     */
    const [credentials] = useReducer(
        (prev, event:any=null) => !event ? prev : {
            ...prev,
            [event.target.id]: event.target.value.trim()
        },
        {
            email: "",
            password: "",
            apiKey:  "",
            server: "https://graph.oceanics.io/api"
        }
    );
   
    return {
        catalog,
        login: () => {},
        register: () => {},
        populate: () => {
            console.log("Populate...");
        }
    };
};


export default useBathysphereApi