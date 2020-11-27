import React from "react";
import styled from "styled-components";
import Table from "./Table";
import Form from "./Form";
import useObjectStorage from "../hooks/useObjectStorage";
import {orange} from "../palette";

const StyledError = styled.div`
    color: ${orange};
    text-align: center;
    border: 0.1rem solid;
    margin: 0;
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: inherit;
    font-family: inherit;
`;

const schema = [{
    label: "key",
    type: "string"
},{
    label: "size",
    type: "float",
    parse: (x) => { return parseInt(x) },
    // format: (x) => { return `${x.toFixed(1)}` }
},{
    label: "updated",
    type: "datetime"
}];


/**
 * In S3 storage objects are grouped by prefix. In our system
 * this is interpreted as thematic or topological collections.
 * This is somewhat analogous to the STAC specificiation. 
 */
const Collections = ({options}) => 
    options.length ? 
    <Form
        fields={[{
            type: "select",
            id: "collection",
            required: true,
            options
        }]}
    /> : 
    <StyledError>{"(!) No collections"}</StyledError>;

/** 
 * Assets are files, usually remote, in this case stored in 
 * S3 object storage. 
 */
const Assets = ({assets, order, schema}) => 
    assets && assets.length ? 
    <Table 
        order={order} 
        records={assets} 
        schema={schema}
    /> : 
    <StyledError>{"(!) No assets"}</StyledError>;


/**
 * The Storage component provides and interface to view
 * S3 object storage assets. 
 */
export default ({
    target,
    delimiter,
    order="key",
}) => {

    const fs = useObjectStorage({
        target: `${target}?delimiter=${delimiter}`
    });

    return <>
        {fs ? 
        <>
        <Collections options={(fs.collections||[]).map(({key})=>key)}/>
        <Assets {...{schema, order, assets: fs.assets}}/>
        </>
        : <StyledError>{"(!) Loading"}</StyledError>}
    </> 
}; 

