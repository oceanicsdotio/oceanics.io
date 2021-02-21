import React from "react";
import useHistogramCanvas from "../hooks/useHistogramCanvas";

/*
 * Suitability aggregation features are histograms drawn to a canvas.
 */
export default ({ 
    features, 
    foreground="#CCCCCCFF"
}) => {

    const {ref, message} = useHistogramCanvas({
        histogram: JSON.parse(features[0].properties.histogram), 
        foreground,
        caption: "Oyster suitability"
    });

    return <>
        <canvas ref={ref}/>
        {message}
    </>
    
};