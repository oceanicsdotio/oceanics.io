import React from "react";
import styled from "styled-components";

const StyledCell = styled.td``;

const StyledRow = styled.tr``;

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
    border: 1px solid black;
`;

const StyledFoot = styled.tfoot``;

const evt = () => {
  console.log("onBlur trigger");
}

const editableCell = (record, col, ind) => {
  const value = record[col.label];
  const update = e => record[col.label] = col.parse ? col.parse(e.target.value) : e.target.value;
  return (
    <td key={ind}>
      <input onBlur={update} defaultValue={col.format ? col.format(value) : value} />
    </td>
  )
};

export const recordRow = (schema, record, ind) => {
  const callback = (key, ii) => editableCell(record, key, ii);
  return (
    <tr key={ind}>
      <th key={ind} scope={"row"}>{ind}</th>{schema.map(callback)}
    </tr>
  )
};

export default (props) => {

  const { schema, records, order } = props;

  return (
    <StyledTable>
      <thead>
      {
        <tr>
          <th>{"INDEX"}</th>
          {schema.map((item, ii) => {
            return <th key={ii} scope={"col"} onClick={evt}>{item.label.toUpperCase()}</th>
          })}
        </tr>
      }
      </thead>
      <tbody>
      {
        records.sort((a, b) => a[order] > b[order] ? 1 : -1)
          .map((r, i) => {
            return recordRow(schema, r, i)
          })
      }
      </tbody>
    </StyledTable>
  )
}
