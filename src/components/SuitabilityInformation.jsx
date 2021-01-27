import React, { useEffect, useState } from "react";

import useHistogramCanvas from "../hooks/useHistogramCanvas";

/*
 * Suitability aggregation features are histograms drawn to a canvas.
*/
export default ({ 
    features, 
    foreground="#CCCCCCFF"
}) => {
   
    const {statistics, ref} = useHistogramCanvas({
        ref, 
        histogram: JSON.parse(features[0].properties.histogram), 
        foreground
    });

    const [ message, setMessage ] = useState("Calculating...");

    useEffect(() => {
        if (statistics)
            setMessage(`Oyster Suitability (N=${statistics.total})`)
    }, [ statistics ]);

    return <>
        <canvas ref={ref} fg={foreground}/>
        <div>{message}</div>
    </>
    
};