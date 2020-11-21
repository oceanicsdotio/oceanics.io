import React, {useState, useEffect} from "react";
import SwaggerParser from "@apidevtools/swagger-parser";


/**
 * Flatten the route and method pairs to be filtered
 * and converted to UI features
 */
const flattenSpecOperations = ({paths}) =>
    Object.entries(paths).flatMap(([path, schema]) => 
        Object.entries(schema)
            .map(([method, schema]) => Object({path, method, schema}))
        );

/**
 * The useOpenApiLoader hook supplies an OpenAPI specification for a 
 * simulation backend, and uses it to construct an interface.
 */
export default ({
    specUrl,
    scrapeIndexPage=false,
}) => {

    /**
     * Hook loads and parses an OpenAPI spec from a URL.
     * It runs once when the component loads
     */
    const [apiSpec, setApiSpec] = useState(null); // OpenAPI spec struct

    useEffect(()=>{
        SwaggerParser.validate(specUrl, (err, api) => {
            if (err) console.error(err);
            else setApiSpec(api);
        });   
    },[]);

    /**
     * Hook gets any existing configurations from the API 
     * and formats them for display in React State.
     * 
     * The request url is inferred
     * from the `servers` object of the OpenAPI specification.
     */
    const [index, setIndex] = useState(null); // loaded from API
    useEffect(()=>{
        if (!scrapeIndexPage || !apiSpec) return;
        
        fetch(apiSpec.servers[0].url)
            .then(response => response.json())
            .then(indexPage => {setIndex(indexPage)});

    }, [apiSpec]);


    /**
     * Extract and flatten the paths and methods
     */
    const [methods, setMethods] = useState([]);
    useEffect(()=>{
        if (!apiSpec) return;
        setMethods(flattenSpecOperations(apiSpec));
    }, [apiSpec])

    return {apiSpec, index, methods};
}