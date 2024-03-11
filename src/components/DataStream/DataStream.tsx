import React from "react";
import useDataStream from "./useDataStream";
import type { IDataStream } from "./useDataStream";

const DataStream = (args: IDataStream) => {
    const {ref, message} = useDataStream(args);
    return <div>
        <label>{message}</label>
        <canvas ref={ref} />
    </div>
}
export default DataStream;