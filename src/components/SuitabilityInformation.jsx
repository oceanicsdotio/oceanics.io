/**
 * Basic react, friends from Hooks.
 */
import React from "react";

/**
 * Colors for style.
 */
import { ghost } from "../palette";

/**
 * Use histogram reducer hook to visualize data.
 */
import useHistogramCanvas from "../hooks/useHistogramCanvas";

/**
 * Use particles hook
 */
import useLagrangian from "../hooks/useLagrangian";

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

    // Histogram references and metadata
    const histogram = useHistogramCanvas({
        histogram: JSON.parse(properties.histogram), 
        foreground,
        caption: observedProperty
    });

    // Particle references and metadata
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
        <label>{lag.message}</label>
        <canvas ref={lag.ref}/>
        <label>{dataStream.message}</label>
        <canvas ref={dataStream.ref}/>
    </div>
};