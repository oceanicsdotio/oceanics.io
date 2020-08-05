import React, {useState, useEffect} from "react";
import styled from "styled-components";

const StyledCell = styled.td`
    padding: 1px;
    margin: 0;
`;

const StyledInput = styled.input`
    position: relative;
    width: 100%;
    height: 100%;
    padding: 1px;;
    margin: 1px;
    text-align: left;
    border: solid 1px #333333;
    border-radius: 3px;
    background: #202020;
    font-family: inherit;
    color: #CCCCCC;
    text-decoration: none;
    overflow: hidden;

    &:focus {
        border-color: #77CCFF;
    }

    &:hover:not(:focus) {

        border-color: #EF5FA1;
        animation: scroll-left 5s linear 1;
    
        @keyframes scroll-left {
            0%   { 
                text-indent: 0; 		
            }
            100% {
                text-indent: -50%; 
            }
        }
    }

    
    
`;

const StyledRow = styled.tr`
    padding: 0;
    margin: 0; 
`;

const StyledCol = styled.col`
    width: auto;
`;

const StyledTable = styled.table`
    table-layout: fixed; /* by headings to make behavior more predictable */
    position: relative;
    width: 90vw;
    left: calc(-45vw + 50%);
`;

const StyledHead = styled.th`
    padding: 0px;
    color: #77CCFF;
    /* background: #202020; */
    /* border: 1px solid black; */
`;

const EditableCell = ({ record, col: { label, format, parse }, ind }) => {

    let value = record[label];
    if (typeof value === typeof "") {
        value = value.trim();
    } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
    }
    return (
        <StyledCell key={ind}>
            <StyledInput 
                onBlur={({target}) => {
                    record[label] = parse ? parse(target.value) : target.value;
                }} 
                defaultValue={format ? format(value) : value} />
        </StyledCell>
    )
};

export const RecordRow = ({ schema, record, ind }) => {
    return (
        <StyledRow key={ind}>
            {schema.map((key, ii) => <EditableCell record={record} col={key} ind={ii} key={ii}/>)}
        </StyledRow>
    )
};


const CallbackHeader = ({label, key, onClick=null}) => 
    <StyledHead key={key} scope={"col"} onClick={onClick}>
        {label.replace(/([a-z](?=[A-Z]))/g, '$1 ').toLowerCase()}
    </StyledHead>;


export default (props) => {

    const [schema, setSchema] = useState(props.schema)
    const [records, setRecords] = useState(props.records)
 
    useEffect(()=>{

        if (schema === undefined) {
            const _implicitSchema = records.map(e => {
                return new Set(Object.keys(e).filter(key => !key.includes("@")))
            }).reduce(
                (acc, current) => new Set([...acc, ...current])
            );
    
            let priority = [];
            ["uuid", "name"].forEach(key => {
                if (_implicitSchema.delete(key)) {
                    priority.push(key);
                }
            });

            setSchema(priority.concat(Array.from(_implicitSchema)).map(x => {return {label: x, type: "string"}}));
        }
    }, []);

    const sortTable = (label) => {
        setRecords([...records.sort((a, b) => a[label] > b[label] ? 1 : -1)]);
    }

    return schema ? (
        <StyledTable>
            <thead>
                <tr>
                    {schema.map(({label}, key) =>
                        <StyledHead key={key} scope={"col"} onClick={() => sortTable(label)}>
                            {label.replace(/([a-z](?=[A-Z]))/g, '$1 ').toLowerCase()}
                        </StyledHead>
                    )}
                </tr>
            </thead>
            <tbody>
                {records.map((r, i) => <RecordRow schema={schema} record={r} ind={i} key={i}/>)}
            </tbody>
        </StyledTable>
    ) : null;
}