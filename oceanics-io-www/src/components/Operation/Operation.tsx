import React, { useState, Dispatch, SetStateAction } from "react";
import styled from "styled-components";
import Form from "../Form/Form";

/**
 * File upload interface
 */
// const uploadInput = {
//     id: "file upload",
//     type: "file",
//     accept: "application/json"
// }

export type OperationType = {
  service: string;
  className: string;
  path: string;
  method: string;
  view: {
    body: string;
    query: string;
  };
  schema: {
    description: string[];
    summary: string;
  };
};

/**
 * Operations are URL patterns, containing methods.
 */
const Operation = ({
  view,
  service,
  className,
  path,
  method,
  schema: { description, summary },
}: OperationType) => {
  const [hidden, setHidden] = useState(false);
  const [upload, setUpload] = useState(false);
  const toggle = (setState: Dispatch<SetStateAction<boolean>>) => () => {
    setState((prev: boolean): boolean => !prev);
  };

  return (
    <div className={className}>
      <h2 onClick={toggle(setHidden)}>{summary}</h2>
      <h3>Description</h3>
      {description.map((text, ii) => (
        <p key={`${path + method}-text-${ii}`}>{text}</p>
      ))}
      <div hidden={hidden}>
        <button id={"toggle-upload"} onClick={toggle(setUpload)}>
          {`Use a ${upload ? "form" : "file"} instead`}
        </button>

        <Form
            action={()=>{}}
            id={`${service}-api-body`}
            fields={[]}
            actions={[]}
        />
            
            {view.query.length ? <h3>{"Query"}</h3> : null}
            {/* <Form
                id={`${service}-api-query`}
                fields={view ? view.query : null}
                actions={[]}
            /> */}

            {/* <Form
                id={`${service}-api-submit`}
                fields={null}
                actions={[{
                    value: method.toUpperCase(),
                    destructive: "true"
                }]}
            /> */}
      </div>
    </div>
  );
};

const StyledOperation = styled(Operation)``;
export default StyledOperation;
