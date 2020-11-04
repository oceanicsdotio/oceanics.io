import React from "react";
import styled from "styled-components";
import {ghost, shadow, grey, pink, blue} from "../palette"

const StyledCell = styled.td`
    margin: 0;
    padding: 0;
`;

const StyledHead = styled.th`
    padding: 0;
    margin: 1px;
    color: ${ghost};
    text-align: left;
    position: relative;
`;

const StyledInput = styled.input`
    padding: 3px;
    margin: 1px;
    position: inherit;
    text-align: left;
    border: none;
    
    background: ${grey};
    font-family: inherit;
    color: ${ghost};
    text-decoration: none;
    overflow: hidden;

    &:focus {
        border-color: ${blue};
        border: 1px solid;
        margin: 0px;
    }

    &:hover:not(:focus) {
        border: 1px solid;
        margin: 0px;
        border-color: ${pink};
        animation: scroll-left 5s linear 1;
    
        @keyframes scroll-left {
            0%   {text-indent: 0;}
            100% {text-indent: -50%;}
        }
    } 
`;

const StyledTable = styled.table`
    position: relative;
    width: 100%;
    visibility: ${({hidden})=>hidden?"hidden":null};
    overflow: scroll;
`;

const EditableCell = ({ 
    record, 
    col: { 
        label, 
        format, 
        parse 
    }, 
    ind 
}) => {

    let value = record[label];
    if (typeof value === typeof "") {
        value = value.trim();
    } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
    }
    return <StyledCell key={ind}>
        <StyledInput 
            onBlur={({target}) => {
                record[label] = parse ? parse(target.value) : target.value;
            }} 
            defaultValue={format ? format(value) : value} 
        />
    </StyledCell>
};

export default ({
    records,
    schema=null, 
    priority=["uuid", "name"]
}) => {

    const implicitSchema = schema ? schema : Array.from((records||[]).map(e => {
        const keys = Object.keys(e)
            .filter(key => !key.includes("@"));
        return new Set(keys);
    }).reduce(
        (a, b) => new Set([...a, ...b]),
        []
    )).map(label => Object({
        label,
        type: "string"
    }));

    const hidden = records === undefined || !records;
    
    return <StyledTable hidden={hidden}>
        <thead>
            <tr>
                {implicitSchema.map(({label}, key) =>
                    <StyledHead key={key} scope={"col"}>
                        {label}
                    </StyledHead>
                )}
            </tr>
        </thead>
        <tbody>
            {(records || []).map((record, ii) => 
                <tr key={ii}>
                {implicitSchema.map((key, jj) => 
                    <EditableCell 
                        record={record} 
                        col={key} 
                        ind={jj} 
                        key={jj}
                    />
                )}
            </tr>
            )}
        </tbody>
    </StyledTable>
}