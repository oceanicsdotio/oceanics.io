/**
 * React and friends
 */
import React, {useReducer} from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * For components
 */
import Form from "../Form/Form";
import InputWrapper from "../Form/Input";

/**
 * Color palette
 */
import {grey} from "../../palette";


/**
 * Collapsible container for hiding content.
 */
const Collapse = styled.div`
    visibility: ${({hidden})=>hidden?"hidden":null};
`;

/**
 * File upload interface
 */
const uploadInput = {
    id: "file upload",
    type: "file",
    accept: "application/json"
}


type OperationType = {
    service: string,
    className: string,
    path: string,
    method: string,
    view: {
        body: any,
        query: any
    },
    schema: {
        description: string[],
        summary: string
    }
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
}: OperationType) => {

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
                    destructive={true}
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

export default StyledOperation