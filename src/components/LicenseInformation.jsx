import React, { useEffect, useState } from "react";

/**
 * Use here temporarily for demo.
 */
import useDataStream from "../hooks/useDataStream";

const cleanAndParse = text => 
    text.replace('and', ',')
        .replace(';', ',')
        .split(',')
        .map(each => each.trim());

/**
 * Parse limited purpose aquaculture license data into
 * a data centric view
 */
export default ({ features }) => {
    /**
     * Array of unique species, created by parsing lease records and doing
     * some basic text processing.
     */
    const [ species, setSpecies ] = useState(null);

    /**
     * Latitude and longtiude.
     */
    const [ location, setLocation ] = useState(null);

    /**
     * Set the species array.
     */
    useEffect(() => {
        setSpecies([...(new Set(features.flatMap(({properties}) => cleanAndParse(properties.species))))]);
    }, []);


    /**
     * Set the state value for location coordinates.
     */
    useEffect(() => {
        setLocation(features.reduce(([x, y], {coordinates: [lon, lat]}) => [
            x+lon/features.length, 
            y+lat/features.length
        ], [0, 0]));
    }, []);

    /**
     * Show calculated environmental data as example.
     */
    const { ref } = useDataStream({});


    return <>
        {location ? `${location[0].toFixed(4)}, ${location[1].toFixed(4)}` : "Calculating..."}
        <ul>
            {species ? species.map(each => <li key={each}>{each}</li>)  : "Loading species..."}
        </ul> 
        <canvas ref={ref}/>
        {"Light"}    
    </>
};