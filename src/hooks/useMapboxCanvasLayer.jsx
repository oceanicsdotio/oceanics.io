import {useEffect} from "react";

// Out ready for Mapbox as a Layer object description
const CanvasSource = ({
    canvas,
    animate=true
}) => 
    Object({
        type: "canvas", 
        canvas,
        animate,
        coordinates: [
            [0, 60],
            [90, 60],
            [90, 0],
            [0, 0]
        ], 
    });

/**
Asynchronously retrieve the geospatial data files and parse them.

Skip this if the layer data has already been loaded, or if the map doesn't exist yet
*/

export default ({
    map=null,
    canvas=null
}) => {
    useEffect(() => {
        if (!map || !canvas) return;
        map.addLayer({
            type: "raster", 
            id: "canvas-layer",
            source: CanvasSource({
                canvas
            })
        });
    }, [map]);
};