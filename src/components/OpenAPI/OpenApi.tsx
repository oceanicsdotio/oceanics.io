import styled from "styled-components";
import PropTypes from "prop-types";
import Markdown from "react-markdown";
import React from "react";
import Form from "../Form/Form";
import useOpenApi from "./useOpenApi";
import type { Operation } from "./useOpenApi";
import { ghost, charcoal, orange } from "../../palette";

export interface IOpenApi { 
    /**
     * Source on the server to fetch the JSON
     * specification from.
     */
    src: string
    /**
     * Hook for styled components.
     */
    className?: string
}
const propTypes = {
    src: PropTypes.string.isRequired,
    className: PropTypes.string
}

/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export const OpenApi = ({ src, className }: IOpenApi) => {
  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const {api} = useOpenApi({src});
  
  return (
    <div className={className}>
        <h1>{api.info.title}</h1>
        <Markdown>{api.info.description}</Markdown>
        {api.operations.map((operation: Operation) => <>
            <h2>{operation.summary}</h2>
            <h3>path</h3>
            <Markdown>
                {`\`${operation.path}\``}
            </Markdown>
            <h3>method</h3>
            <Markdown>
                {operation.method.toUpperCase()}
            </Markdown>
            <h3>description</h3>
            <Markdown>
                {operation.description}
            </Markdown>
            <Form
                name={"request body"}
                action={()=>{}}
                id={`api-request-body-${operation.path}-${operation.method}`}
                fields={operation.requestBody??[]}
                actions={[]}
            />
            <Form
                name={"query parameters"}
                action={()=>{}}
                id={`api-query-${operation.path}-${operation.method}`}
                fields={operation.parameters??[]}
                actions={[]}
            /></> 
        )}
    </div>
  );
};

export const StyledOpenApi = styled(OpenApi)`
    max-width: 65ch;
    display: block;
    padding: 1rem 1rem;
    margin: 0;
    border-radius: 5px;
    background-color: ${charcoal};
    color: ${ghost};
    -webkit-appearance: none; 
    -moz-appearance: none;

    & h3 {
        text-transform: capitalize;
        font-size: inherit;
        font-style: inherit;
    }

    & a {
        color: ${orange};
    }

    & code {
        border: 1px dashed ${orange};
        border-radius: 5px;
        background-color: black;
        padding: 5px;
    }
`;

OpenApi.displayName = "OpenApi";
OpenApi.propTypes = propTypes;
StyledOpenApi.propTypes = propTypes;
export default StyledOpenApi;
