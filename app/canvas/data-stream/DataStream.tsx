"use client"
import React from "react";
import useDataStream, {type IDataStream } from "./useDataStream";

const DataStream = (args: IDataStream) => {
    const {ref, message} = useDataStream(args);
    return <div>
        <div>{message}</div>
        <canvas ref={ref} />
    </div>
}
export default DataStream;