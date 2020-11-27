import React from "react";
import styled from "styled-components";
import Table from "./Table";
import useObjectStorage from "../hooks/useObjectStorage";

const StyledError = styled.div`
    color: orange;
    text-align: center;
    border: 1px solid;
    margin: 0;
`;

export default ({
    target,
    order="key",
}) => {

    const fileSystem = useObjectStorage({target});

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
    
    return fileSystem && fileSystem.collections ? 
        <Table 
            order={order} 
            records={fileSystem.collections} 
            schema={schema}
        /> : 
        <StyledError>
            {"(!) Object storage unavailable"}
        </StyledError>
}; 

