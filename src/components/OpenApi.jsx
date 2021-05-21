import React, {useReducer} from "react";
import styled from "styled-components";

import Form, {InputWrapper} from "./Form";

import {grey} from "../palette";

import { useState, useEffect, useRef } from "react";

/**
 * Dedicated Worker loader
 */
import Worker from "../workers/useOpenApiLoader.worker.js";
import useWorkers from "./useWorkers";


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
 * Collapsible container for hiding content.
 */
const Collapse = styled.div`
    visibility: ${({hidden})=>hidden?"hidden":null};
`;


/**
 * Metadata component about the API itself.
 */
const Header = ({
    info: {
        title, 
        version,
        description
    }
}) => 
    <div>
        <h1>{`${title}, v${version}`}</h1>
        {description.map((text, ii) => <p key={`title-text-${ii}`}>{text}</p>)}
    </div>



const uploadInput = {
    id: "file upload",
    type: "file",
    accept: "application/json"
}


/**
 * Operations are URL patterns, containing methods.
 */
const Operation = ({
    service,
    className,
    path,
    method,
    view,
    schema: {
        description,
        summary
    }
}) => {

    // const view = useOpenApiForm({parameters, requestBody});
    const [hidden, toggleHidden] = useReducer(prev=>!prev, false); 
    const [upload, toggleUpload] = useReducer(prev=>!prev, false);

    return <div className={className}>
        <h2 onClick={toggleHidden}>{summary}</h2>
        <h3>{"Description"}</h3>
        {description.map((text, ii) => <p key={`${path+method}-text-${ii}`}>{text}</p>)}
        <Collapse hidden={hidden}>
        
            {
                view.body ? 
                <>
                <InputWrapper 
                    type={"button"}
                    onClick={toggleUpload}
                    destructive={"true"}
                    value={`Use a ${upload ? "form" : "file"} instead`}>
                </InputWrapper>
                <h3>{upload ? "Upload JSON file" : "Request body"}</h3></> :
                null
            }

            <Form
                id={`${service}-api-body`}
                fields={view ? upload ? [uploadInput] : view.body : null}
                actions={[]}
            />
            
            {view.query.length ? <h3>{"Query"}</h3> : null}
            <Form
                id={`${service}-api-query`}
                fields={view ? view.query : null}
                actions={[]}
            />

            <Form
                id={`${service}-api-submit`}
                fields={null}
                actions={[{
                    value: method.toUpperCase(),
                    destructive: "true"
                }]}
            />
        </Collapse>
    </div>
};


/**
 * Styled version of the `Operation` component.
 */
const StyledOperation = styled(Operation)`
    border-top: 0.1rem dashed ${grey};
    border-bottom: 0.1rem dashed ${grey};
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