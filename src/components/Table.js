import React from "react";

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
  const callback = (key, ii) => {return editableCell(record, key, ii)};
  return (
    <tr key={ind}>
      <th key={ind} scope={"row"}>{ind}</th>{schema.map(callback)}
    </tr>
  )
};

export default (props) => {
  const { schema, records, order } = props;
  return (
    <table>
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
    </table>
  )
}
