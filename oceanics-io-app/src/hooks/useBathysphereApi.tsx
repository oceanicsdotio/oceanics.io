import { useEffect, useState, useRef, useReducer } from "react";

/**
 * Dedicated worker loader.
 */
import BathysphereWorker from "worker-loader!../workers/useBathysphereApi.worker.ts";

/**
 * The catalog page is like a landing page to the api.
 * 
 * Routes from here correspond to entities and 
 * collections in the graph database.
 * 
 * If access token is set in React state, use it to get the catalog index from Bathysphere
 */
export default (server: string) => {

    /**
     * Instantiate web worker reference for background tasks.
     */
     const worker: any = useRef(null);

     /**
      * Create worker, and terminate it when the component unmounts.
      * 
      * I suspect that this was contributing to performance degradation in
      * long running sessions. 
      */
     useEffect(() => {
         if (!BathysphereWorker) {
             console.error("Cannot create workers, no loader provided")
             return
         }
         worker.current = new BathysphereWorker();
         return () => { 
             if (worker.current) worker.current.terminate();
         }
     }, []);
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
        login: () => {
            worker.current.login(credentials).then(setAccessToken);
        },
        register: () => {
            worker.current.login(credentials).then(console.log);
        },
        populate: () => {
            console.log("Populate...");
        }
    };
};
