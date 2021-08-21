/**
 * React and friends
 */
import React, {useState, useEffect, RefObject, FC} from "react";

import Placeholder from "oceanics-io-ui/build/components/OpenAPI/Placeholder"

export type ApiType = {
    specUrl: string;
    service: string;
    scrapeIndexPage: boolean;
    worker?: RefObject<unknown>;
}

/**
 * The OpenApi component uses an OpenAPI specification for a 
 * simulation backend, and uses it to construct an interface.
 */
const OpenApi: FC<ApiType> = ({
    specUrl,
    // service,
    scrapeIndexPage,
    worker,
}) => {
     /**
      * OpenAPI spec structure will be populated asynchronously once the 
      * web worker is available.
      */
     const [apiSpec, setApiSpec] = useState<object|null>(null); 
 
     /**
      * Hook loads and parses an OpenAPI spec from a URL using a
      * background worker.
      * 
      * It runs once when the component loads. This allows
      * the specification to be available before derived data
      * is calculated for UI. 
      */
     useEffect(() => {
         // @ts-ignore
         if (worker.current) worker.current.load(specUrl).then(setApiSpec);
     },[ worker ]);
 
     /**
      * API routes to convert to forms.
      */
     const [, setMethods ] = useState([]);
 
     /**
      * Extract and flatten the paths and methods.
      */
     useEffect(() => {
         if (!apiSpec) return;
         // @ts-ignore
         worker.current.flattenSpecOperations(apiSpec.paths).then(setMethods);
     }, [ apiSpec ]);
 
     /**
      * Collections are scraped from available implementations
      * of the API listed in the `servers` block.
      */
     const [, setIndex ] = useState<object|null>(null);
     
     /**
      * Hook gets any existing configurations from the API 
      * and formats them for display in React State.
      * 
      * The request url is inferred
      * from the `servers` object of the OpenAPI specification.
      */
     useEffect(() => {
         if (!scrapeIndexPage ||  !apiSpec) return;
         // @ts-ignore
        worker.current.scrapeIndexPage(apiSpec.servers[0].url).then(setIndex);    
     }, [ apiSpec ]);
    
    return (
        <div> 
            <Placeholder>{`Loading ${specUrl}...`}</Placeholder> 
            <Placeholder>{`Loading methods...`}</Placeholder>
        </div>
    )
}

export default OpenApi;