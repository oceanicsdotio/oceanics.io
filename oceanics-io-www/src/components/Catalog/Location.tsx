/**
 * React and friends
 */
import React, { useState, useEffect } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types";

/**
 * Color palette
 */
import { orange, ghost, shadow } from "../../palette";

/**
 * Compile time type checking
 */
export type LocationType = {
    key: string,
    id: string,
    className?: string,
    properties: {
        name: string,
        nav_unit_n?: string,
        port_name?: string
    },
    coordinates: number[]
}

/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    key,
    className,
    properties: {
        name,
        nav_unit_n,
        ...properties
    },
    coordinates = []
}: LocationType) => {
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

    /**
     * Guess name from data if none is given
     */
    const [ title, setTitle ] = useState("Naming...");
    
    /**
     * Some jank that should get moved
     */
    useEffect(() => {
        const title = name || (nav_unit_n ?? "");
        if (title) {
            setTitle(title);
        } else if (!!(properties.port_name ?? false)) {
            setTitle(properties.port_name??"");
        } else if ("species" in properties) {
            setTitle("Sea farm");
        } else if ("yearSunk" in properties) {
            setTitle("Wreck");
        }
    }, []);

    /**
     * Render list of property items
     */
    return <div 
        className={className}
        id={key}
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
     * Handle for accessing by ID
     */
    key: PropTypes.string.isRequired,
    /**
     * Spatial coordinates
     */
    coordinates: PropTypes.arrayOf(PropTypes.number),
    /**
     * Class name for styled components CSS
     */
    className: PropTypes.string.isRequired,
    /**
     * Location metadata
     */
    properties: PropTypes.shape({
        name: PropTypes.string.isRequired,
        nav_unit_n: PropTypes.string,
        port_name: PropTypes.string
    }).isRequired
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

/**
 * Export styled version by default
 */
export default StyledLocation;
