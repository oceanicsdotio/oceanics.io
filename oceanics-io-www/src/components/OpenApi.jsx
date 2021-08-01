/**
 * React and friends
 */
import React, {useState, useEffect} from "react";

/**
 * Component level styles
 */
import styled from "styled-components";

/**
 * Color palette
 */
import {grey} from "../palette";


/**
 * Dedicated Worker loader
 */
import Worker from "../workers/useOpenApiLoader.worker.js";
import useWorkers from "../hooks/useWorkers";


/**
 * Divvy up blank space
 */
const Placeholder = styled.div`
    border-top: 0.1rem dashed ${grey};
    border-bottom: 0.1rem dashed ${grey};
    font-size: x-large;
    padding: 2rem;
`;

/**
 * The OpenApi component uses an OpenAPI specification for a 
 * simulation backend, and uses it to constuct an interface.
 */
export default ({
    specUrl,
    service,
    scrapeIndexPage=false,
}) => {

    /**
     * Web worker for loading, validation, and formatting in background.
     */
     const worker = useWorkers(Worker);

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
     const [ methods, setMethods ] = useState([]);
 
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
    
    return <div> 
        {
            !apiSpec ? 
            <Placeholder>{`Loading ${specUrl}...`}</Placeholder> :
            <Header info={apiSpec.info}/>
        }
        <div>
        {
            !methods ? 
            <Placeholder>{`Loading methods...`}</Placeholder> :
            methods.map(props => 
                <StyledOperation {...{
                    key: props.path+props.method, 
                    service: service,
                    ...props
                }}/>
            )
        }
        </div>
    </div> 
}