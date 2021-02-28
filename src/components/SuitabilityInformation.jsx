import React from "react";
import {ghost} from "../palette";

import useHistogramCanvas from "../hooks/useHistogramCanvas";
import useLagrangian from "../hooks/useLagrangianTest";


/**
 * Use here temporarily for demo.
 */
import useDataStream from "../hooks/useDataStream";

/*
 * Suitability aggregation features are histograms drawn to a canvas.
 */
export default ({ 
    properties, 
    className,
    foreground = ghost,
    observedProperty = "Oyster suitability"
}) => {

    const histogram = useHistogramCanvas({
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

    /**
     * Show calculated environmental data as example.
     */
    const dataStream = useDataStream({});


    return <div className={className}>
        <label>{histogram.message}</label>
        <canvas ref={histogram.ref}/>
        <label>{"Fish"}</label>
        <canvas ref={lag.ref}/>
        <label>{"Light"}</label>
        <canvas ref={dataStream.ref}/>
        
    </div>
    
};