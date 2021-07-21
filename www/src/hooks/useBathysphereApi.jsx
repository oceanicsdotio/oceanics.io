import { useEffect, useState, useRef, useReducer } from "react";

/**
 * Dedicated worker loader.
 */
import Worker from "../workers/useBathysphereApi.worker.js";

/**
 * The catalog page is like a landing page to the api.
 * 
 * Routes from here correspond to entities and 
 * collections in the graph database.
 * 
 * If access token is set in React state, use it to get the catalog index from Bathysphere
 */
export default () => {

    /**
     * Web worker reference for fetching and auth.
     */
    const worker = useWorkers(Worker);

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
            worker.current.query({server, accessToken}).then(setCatalog); 
    }, [ worker, accessToken ]);

    
    /**
     * The login container handles authorization interactions with the
     * backend.
     */
    const [credentials, refresh] = useReducer(
        (prev, event=null) => !event ? prev : {
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
        login: event => {
            event.persist();
            worker.current.login(credentials).then(setAccessToken);
        },
        register: event => {
            event.persist();
            worker.current.login(credentials).then(console.log);
        },
        populate: event => {
            event.persist();
            console.log("Populate...");
        }
    };
};
