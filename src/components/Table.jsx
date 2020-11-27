import React from "react";
import styled from "styled-components";
import {ghost, grey, shadow, orange} from "../palette"
import {InputWrapper} from "./Form";

const StyledInput = styled(InputWrapper)`

    border-color: ${grey};
    text-align: left;
    border-radius: 0.25rem;
    margin: 0;
    
    background: ${shadow};
    font-family: inherit;
    color: ${ghost};
    overflow: hidden;

    &:focus {
        border-color: ${orange};
    }

    &:hover:not(:focus) {
        animation: scroll-left 5s linear 1;
    
        @keyframes scroll-left {
            0%   {text-indent: 0;}
            100% {text-indent: -50%;}
        }
    } 
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
    return <td key={ind}>
        <StyledInput 
            onBlur={({target}) => {
                record[label] = parse ? parse(target.value) : target.value;
            }} 
            defaultValue={format ? format(value) : value} 
        />
    </td>
};

const Table = ({
    records,
    className,
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
    
    return <table hidden={hidden} className={className}>
        <thead>
            <tr>
                {implicitSchema.map(({label}, key) =>
                    <th key={key} scope={"col"}>
                        {label}
                    </th>
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
    </table>
};


const StyledTable = styled(Table)`

    position: relative;
    width: 100%;
    visibility: ${({hidden})=>hidden?"hidden":null};
    overflow: scroll;
    box-sizing: border-box;

    & > * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    & > th {
        color: ${ghost};
        text-align: left;
        position: relative;
    }  
`;

export default StyledTable;