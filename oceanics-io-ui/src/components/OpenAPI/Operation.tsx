/**
 * React and friends
 */
import React, {useState, Dispatch, SetStateAction} from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * For components
 */
// import Form from "../Form/Form";
import Button from "../Form/Button";

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
// const uploadInput = {
//     id: "file upload",
//     type: "file",
//     accept: "application/json"
// }


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
    // service,
    className,
    path,
    method,
    // view,
    schema: {
        description,
        summary
    }
}: OperationType) => {

    // const view = useOpenApiForm({parameters, requestBody});
    const [hidden, setHidden] = useState<boolean>(false); 
    const [upload, setUpload] = useState<boolean>(false);
    const toggle = (setState: Dispatch<SetStateAction<boolean>>) => () => {
        setState((prev: boolean): boolean=>!prev)
    }

    return <div className={className}>
        <h2 onClick={toggle(setHidden)}>{summary}</h2>
        <h3>{"Description"}</h3>
        {description.map((text, ii) => <p key={`${path+method}-text-${ii}`}>{text}</p>)}
        <Collapse hidden={hidden}>
            <Button id={"toggle-upload"} onClick={toggle(setUpload)}>
                {`Use a ${upload ? "form" : "file"} instead`}
            </Button>
          

            {/* <Form
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
            /> */}
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