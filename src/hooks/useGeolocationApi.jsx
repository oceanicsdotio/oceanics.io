import { useEffect, useState, useRef } from "react";

import Worker from "./useMapboxGeoJsonLayers.worker.js";


export const pulsingDot = ({
    callback = null,
    size = 64
}) => Object({
            
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
    },

    // called once before every frame where the icon will be used
    render: function () {
        var duration = 1000;
        var time = (performance.now() % duration) / duration;

        var radius = (size / 2) * 0.3;
        var outerRadius = (size / 2) * 0.7 * time + radius;
        var ctx = this.context;

    
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(
            size / 2,
            size / 2,
            outerRadius,
            0,
            Math.PI * 2
        );
        
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2 + 4 * (1 - time);
        ctx.stroke();

        // update this image's data with data from the canvas
        this.data = ctx.getImageData(
            0,
            0,
            size,
            size
        ).data;

        if (callback) callback()
        return true;
    }
});


/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 * 
 * This will also trigger a greater initial zoom level.
 */
export default ({callback=null}) => {
 
    const [layer, setLayer] = useState(null);
    const [icon, setIcon] = useState(null);

    useEffect(() => {
        setIcon(["pulsing-dot", pulsingDot({callback})]);
    }, [])
    
    useEffect(() => {
        
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            ({coords}) => { 
                const worker = new Worker();
                worker.PointFeatureSource(coords).then(setLayer);
                worker.terminate();
            }, 
            () => { console.log("Error getting client location.") }
        );
    }, []);

    return { layer, icon }

};