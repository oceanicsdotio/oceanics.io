import React, {Fragment, useState, useEffect} from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import {orange, ghost} from "../palette";


/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    className,
    properties: {
        name=null,
        nav_unit_n=null,
        ...properties
    },
    coordinates = null
}) => {

    

    /**
     * Location summary data. May not be available for large
     * polygons for instance, in which case it will fall back
     * to the click position or a known center. 
     */
    const [ label, setLabel ] = useState("Projecting...");

    /**
     * Determine the reference position of the Location entity
     */
    useEffect(() => {
        if (!coordinates) return;

        const [lon, lat] = coordinates;
        setLabel(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }, []);

    

    return <div className={className}>
        <h3>{name || nav_unit_n || properties.port_name}</h3>
        <label>{label}</label>
        <ul>
            {Object.entries(properties)
                .filter(([_, v]) => v !== " " && !!v)
                .map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)
            }
        </ul>
    </div>};


/**
 * Validate Location elements
 */
Location.propTypes = {
    /**
     * Spatial coordinates
     */
    coordinates: PropTypes.array,
    /**
     * Class name for styled components CSS
     */
    className: PropTypes.string,
    /**
     * Location metadata
     */
    properties: PropTypes.object
};

/**
 * The StyledLocation component is just a styled version of Location
 * that includes hover effects. 
 */
const StyledLocation = styled(Location)`
    display: block;
    margin: 0;
    height: auto;
    position: relative;
    background: none;
    box-sizing: border-box;

    border-bottom: 0.05rem solid ${ghost};
    padding: 0.5rem;
    color: ${ghost};

    & > label {
        color: ${orange};
        font-size: larger;
    }
`;


const cleanAndParse = text => 
    text.replace('and', ',')
        .replace(';', ',')
        .split(',')
        .map(each => each.trim());

export default StyledLocation;

export const Locations = ({ features }) => {

    /**
     * Array of unique species, created by parsing lease records and doing
     * some basic text processing.
     */
    const [ species, setSpecies ] = useState(null);

    /**
     * Latitude and longtiude.
     */
    const [ center, setCenter ] = useState(null);

    /**
     * Set the species array.
     */
    // useEffect(() => {
    //     setSpecies([...(new Set(features.flatMap(({properties}) => cleanAndParse(properties.species))))]);
    // }, []);


    /**
     * Set the state value for location coordinates.
     */
    useEffect(() => {
        setCenter(features.filter(f => "coordinates" in f).reduce(([x, y], {coordinates: [lon, lat]}) => [
            x+lon/features.length, 
            y+lat/features.length
        ], [0, 0]));
    }, []);


    return <>
        {features.map((feature, key) =>
            <Fragment key={key}>
                <StyledLocation {...feature}/>
            </Fragment>
        )}
    </>};