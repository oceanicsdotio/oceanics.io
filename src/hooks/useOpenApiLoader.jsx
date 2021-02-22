import {useState, useEffect, useRef} from "react";

/**
 * Dedicated Worker loader
 */
import Worker from "./useOpenApiLoader.worker.js";


/**
 * The useOpenApiLoader hook supplies an OpenAPI specification for a 
 * simulation backend, and uses it to construct an interface.
 */
export default ({
    specUrl,
    scrapeIndexPage=false,
}) => {
    /**
     * Web worker for loading, validation, and formatting in background.
     */
    const worker = useRef(null);

    /**
     * Create the worker, isolated to browser environment
     */
    useEffect(() => {
        worker.current = new Worker();
    }, [])

    /**
     * OpenAPI spec struct will be populated asynchronously once the 
     * web worker is available.
     */
    const [apiSpec, setApiSpec] = useState(null); 

    /**
     * Hook loads and parses an OpenAPI spec from a URL using a
     * background worker.
     * 
     * It runs once when the component loads. This allows
     * the specification to be available before derived data
     * is calculated for UI. 
     */
    useEffect(() => {
        if (worker.current) 
            worker.current.load(specUrl).then(setApiSpec);
    },[ worker ]);

    /**
     * API routes to convert to forms.
     */
    const [methods, setMethods] = useState([]);

    /**
     * Extract and flatten the paths and methods.
     */
    useEffect(() => {
        if (apiSpec) 
            worker.current.flattenSpecOperations(apiSpec.paths).then(setMethods);
    }, [ apiSpec ]);

    /**
     * Collections are scraped from available implementations
     * of the API listed in the `servers` block.
     */
    const [ index, setIndex ] = useState(null);
    
    /**
     * Hook gets any existing configurations from the API 
     * and formats them for display in React State.
     * 
     * The request url is inferred
     * from the `servers` object of the OpenAPI specification.
     */
    useEffect(() => {
        if (scrapeIndexPage && apiSpec)
            worker.current.scrapeIndexPage(apiSpec.servers[0].url).then(setIndex);    
    }, [ apiSpec ]);

    return { apiSpec, index, methods };
}