import React, { useState, useEffect } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { orange, ghost, shadow } from "../palette";


/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    key=null,
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


    const [ title, setTitle ] = useState("Naming...");
    
    useEffect(() => {

        const _title = name || nav_unit_n;
        if (_title) {
            setTitle(_title);
        } else if ("port_name" in properties) {
            setTitle(properties.port_name);
        } else if ("species" in properties) {
            setTitle("Sea farm");
        } else if ("yearSunk" in properties) {
            setTitle("Wreck");
        }
    }, []);


    return <div 
        className={className}
        id={key}
        draggable={true}
        onDragStart={event => {
            event.dataTransfer.setData("text/plain", event.target.id);
            event.dataTransfer.dropEffect = "move";
        }}
    >
        <h3>{title}</h3>
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
    className: PropTypes.string.isRequired,
    /**
     * Location metadata
     */
    properties: PropTypes.object.isRequired
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

    font-family: inherit;

    padding: 0.5rem;
    color: ${ghost};

    cursor: pointer;

    &:hover {
        background: ${shadow};
    }

    & > h3 {
        padding: 0;
        margin: 0;
    }

    & > label {
        color: ${orange};
        font-size: larger;
        padding: 0;
        margin: 0;
    }
`;



export default StyledLocation;
