import React from "react";
import styled from "styled-components";

const StyledCell = styled.td``;

const StyledInput = styled.input`
    position: relative;
    width: 95%;
    height: 100%;
    padding: 5px;
    margin: 0;
    text-align: left;
    border: none;
    background: #202020;
    /* border: solid 1px; */
    font-family: inherit;
    color: #ccc;
    text-decoration: none;
`;

const StyledRow = styled.tr``;

const StyledCol = styled.col`
    width: 10%;
`;

const StyledTable = styled.table`
    table-layout: fixed; /* by headings to make behavior more predictable */
    width: 90vw;
    position: relative;
    left: calc(-45vw + 45%);
    border-collapse: collapse; /* remove duplicate borders */
    border: 3px solid black;
`;

const StyledHead = styled.th`
    padding: 10px;
    /* background: #202020; */
    /* border: 1px solid black; */
`;

const StyledFoot = styled.tfoot``;

const evt = () => {
    console.log("onBlur trigger");
}

const EditableCell = (props) => {

    const { record, col, ind } = props;
    let value = record[col.label];
    if (typeof value === typeof "") {
        value = value.trim();
    }
    const update = e => record[col.label] = col.parse ? col.parse(e.target.value) : e.target.value;
    return (
        <StyledCell key={ind}>
            <StyledInput onBlur={update} defaultValue={col.format ? col.format(value) : value} />
        </StyledCell>
    )
};

export const RecordRow = (props) => {

    const { schema, record, ind } = props;

    return (
        <tr key={ind}>
            <StyledHead key={ind} scope={"row"}>{ind}</StyledHead>
            {schema.map((key, ii) => <EditableCell record={record} col={key} ind={ii} />)}
        </tr>
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
                <StyledCol class={"index"} />
                {schema.map((item, ii) => <StyledCol class={"data"} />)}
            </colgroup>
            <thead>
                {
                    <tr>
                        <StyledHead>{"INDEX"}</StyledHead>
                        {schema.map((item, ii) => <StyledHead key={ii} scope={"col"} onClick={evt}>{item.label.toUpperCase()}</StyledHead>)}
                    </tr>
                }
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
