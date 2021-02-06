import { useEffect, useState, useRef, useReducer } from "react";

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

    const worker = useRef(null);

    useEffect(() => {
        worker.current = new Worker();
    }, []);
 
    /**
     * Icon is the sprite for the object
     */
    const [ icon, setIcon ] = useState(null);

    /**
     * 
     */
    useEffect(() => {
        setIcon(["pulsing-dot", pulsingDot({callback})]);
    }, []);

    const [location, setLocation] = useState(null);
    
    
    useEffect(() => {
    
        if (!navigator.geolocation) return null;

        navigator.geolocation.getCurrentPosition(
            setLocation, 
            () => { console.log("Error getting client location.") },{
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

    }, []);

    /**
     * Layer is the MapBox formatted layer object
     */
    const [ layer, setLayer ] = useState(null);
    
    /**
     * Use thr worker to create the point feature
     */
    useEffect(() => {
        if (!worker.current || !location) return;

        const {longitude, latitude} = location.coords;
        worker.current.UserLocation({longitude, latitude}).then(setLayer);
                
        return () => { worker.current.terminate() }
        
    }, [ worker, location ]);



    return { 
        layer, icon, location
    }

};