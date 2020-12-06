import React, {useReducer} from "react";
import YAML from "yaml";
import styled from "styled-components";

import Form, {InputWrapper} from "./Form";

import useOpenApiLoader from "../hooks/useOpenApiLoader";
import useOpenApiForm from "../hooks/useOpenApiForm";

import {grey} from "../palette";

/**
 * Divvy up blank space
 */
const Placeholder = styled.div`
    border-top: 0.1rem dashed ${grey};
    border-bottom: 0.1rem dashed ${grey};
    font-size: x-large;
    padding: 2rem;
`;

const Collapse = styled.div`
    visibility: ${({hidden})=>hidden?"hidden":null};
`;


/** 
 * Parse a YAML text block that includes arbitrary line breaks
 * and whitespace
 */
const parseYamlText = (text, prefix="title") => 
    YAML.parse(text)
        .split("\n")
        .filter(paragraph => paragraph)
        .map((text, ii) => <p key={`${prefix}-text-${ii}`}>{text}</p>)


/**
 * Meta data about the API itself
 */
const Header = ({
    info: {
        title, 
        version,
        description
    }
}) => <div>
    <h1>{`${title}, v${version}`}</h1>
    {parseYamlText(description, "title")}
</div>


/**
 * Operations are URL patterns, containing methods
 */
const Operation = ({
    service,
    className,
    path,
    method,
    schema: {
        requestBody=null, 
        parameters=null,
        description,
        summary
    }
}) => {

    const view = useOpenApiForm({parameters, requestBody});
    const [hidden, toggleHidden] = useReducer(prev=>!prev, false); 
    const [upload, toggleUpload] = useReducer(prev=>!prev, false);

    const uploadInput = {
        id: "file upload",
        type: "file",
        accept: "application/json"
    }

    return <div className={className}>
        <h2 onClick={toggleHidden}>{summary}</h2>
        <h3>{"Description"}</h3>
        {parseYamlText(description, path+method)}
        <Collapse hidden={hidden}>
        
            {
                view && view.body ? 
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
            
            {view && view.query.length ? <h3>{"Query"}</h3> : null}
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
 * Styled version of the base component
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
}) => {

    const {apiSpec, methods} = useOpenApiLoader({specUrl});
    
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