import React from "react";
import useHistogram from "./useHistogram";
import type { IHistogram } from "./useHistogram";

export const Histogram = (args: IHistogram) => {
    const {ref, message} = useHistogram(args);
    return (<div>
        <label>{message}</label>
        <canvas ref={ref}/>
    </div>)
}

Histogram.displayName = "Histogram";
export default Histogram