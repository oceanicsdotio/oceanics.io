import React, { useEffect, useState } from "react";

const cleanAndParse = text => 
    text.replace('and', ',').replace(';', ',').split(',').map(each => each.trim());

/**
 * Parse limited purpose aquaculture license data into
 * a data centric view
 */
export default ({ features }) => {

    const [ species, setSpecies ] = useState(null);
    const [ location, setLocation ] = useState(null);

    useEffect(() => {
        setSpecies([...(new Set(features.flatMap(({properties}) => cleanAndParse(properties.species))))]);
    }, []);

    useEffect(() => {
        setLocation(features.reduce(([x, y], {coordinates: [lon, lat]}) => [
            x+lon/features.length, 
            y+lat/features.length
        ], [0, 0]));
    }, []);
    
    
    return <>
        <p>{location ? `${location[0].toFixed(4)}, ${location[1].toFixed(4)}` : "Calculating..."}</p>
        <ul>
            {species ? species.map(each => <li key={each}>{each}</li>)  : "Loading species..."}
        </ul>     
    </>
};