import { useEffect, useState, useRef, useReducer } from "react";

/**
 * Dedicated worker loader.
 */
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
    icons, 
    tiles
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

    /**
     * Collections options object generated from API queries. 
     */ 
    const [ options ] = useState([
        {key: "Features of Interest"},
        {key: "Things"},
        {key: "Locations"}
    ]);

    /**
     * Sorted items to render in interface
     */
    const [sorted, setSorted] = useState([]);

    /**
     * Use Web worker to do sorting
     */
    useEffect(()=>{
        if (worker.current)
            worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker]);
    
   
    return {
        catalog,
        options: options.map(({key})=>key),
        refresh,
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
        },
        navigate: event => {
            event.persist();
            worker.current.locationHash(event.target.value).then(hash => {
                location.hash = hash;
            });
        },
        sorted
    };
};
