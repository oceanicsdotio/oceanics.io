import React from "react";
import {ghost} from "../palette";

import useHistogramCanvas from "../hooks/useHistogramCanvas";
import useLagrangian from "../hooks/useLagrangianTest";
/*
 * Suitability aggregation features are histograms drawn to a canvas.
 */
export default ({ 
    properties, 
    foreground = ghost,
    observedProperty = "Oyster suitability"
}) => {

    const { ref, message } = useHistogramCanvas({
        histogram: JSON.parse(properties.histogram), 
        foreground,
        caption: observedProperty
    });

    const lag = useLagrangian({
        source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
        metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json",
        res: 128,
        pointSize: 2.0
    });

    return <>
        <canvas ref={ref}/>
        {message}
        <canvas
            ref={lag.ref}
        />
        {"Fish"}
    </>
    
};