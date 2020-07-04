import React from "react";
import styled from "styled-components";

const StyledCell = styled.td`
    padding: 3px;
    margin: 0;
`;

const StyledInput = styled.input`
    position: relative;
    width: 100%;
    height: 100%;
    padding: 2px;;
    margin: 1px;
    text-align: left;
    border: solid 1px #333333;
    border-radius: 5px;
    background: #202020;
    font-family: inherit;
    font-size: smaller;
    color: #CCCCCC;
    text-decoration: none;

    &:hover {
        border: solid 1px orange;
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
    /* background: #202020; */
    /* border: 1px solid black; */
`;

const StyledFoot = styled.tfoot``;

const evt = () => {
    console.log("onBlur trigger");
}

const EditableCell = (props) => {

    const { record, col, ind } = props;
    const { label, format, parse } = col;

    
    let value = record[label];

  
    if (typeof value === typeof "") {
        value = value.trim();
    } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
    }
    return (
        <StyledCell key={ind}>
            <StyledInput 
                onBlur={({target}) => record[label] = parse ? parse(target.value) : target.value } 
                defaultValue={format ? format(value) : value} />
        </StyledCell>
    )
};

export const RecordRow = (props) => {

    const { schema, record, ind } = props;

    return (
        <StyledRow key={ind}>
            {/* <StyledHead key={ind} scope={"row"}>{ind}</StyledHead> */}
            {schema.map((key, ii) => <EditableCell record={record} col={key} ind={ii} />)}
        </StyledRow>
    )
};

export default (props) => {

    const { records, order } = props;
    let { schema } = props;
    

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

        schema = priority.concat(Array.from(_implicitSchema)).map(x => {return {label: x, type: "string"}});
    }

    return (
        <StyledTable>
            <colgroup>
                {schema.map((item, ii) => <StyledCol class={"data"} />)}
            </colgroup>
            <thead>
                <tr>
                    {schema.map((item, ii) => <StyledHead key={ii} scope={"col"} onClick={evt}>{item.label.toUpperCase()}</StyledHead>)}
                </tr>
            </thead>
            <tbody>
                {
                    records.sort((a, b) => a[order] > b[order] ? 1 : -1)
                        .map((r, i) => <RecordRow schema={schema} record={r} ind={i} />)
                }
            </tbody>
        </StyledTable>
    )
}
