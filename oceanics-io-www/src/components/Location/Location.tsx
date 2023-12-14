import React, { useState, useEffect } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { ghost, charcoal, orange } from "../../palette";


export type LocationType = {
    /**
     * Handle for accessing by ID
     */
    key: string;
    /**
     * Element id for referencing from parent
     */
    id: string;
    /**
     * Class name for styled components CSS
     */
    className?: string;
    /**
     * Location metadata
     */
    properties: {
        name: string;
        nav_unit_n?: string;
        port_name?: string;
    },
    /**
     * Spatial coordinates
     */
    coordinates: [number, number];
    /**
     * Description goes here TypeScript
     */
    tile: {
        publicURL: string;
        anchorHash: string;
    };
    /**
     * A function that takes the coordinates and 
     * refreshes the render target view. 
     */
    panTo: (coordinates: [number, number]) => void;
}

const propTypes = {
    id: PropTypes.string.isRequired,
    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
    className: PropTypes.string.isRequired,
    properties: PropTypes.shape({
        name: PropTypes.string.isRequired,
        nav_unit_n: PropTypes.string,
        port_name: PropTypes.string
    }).isRequired,
    tile: PropTypes.shape({
        publicURL: PropTypes.string.isRequired, 
        anchorHash: PropTypes.string.isRequired
    }).isRequired,
    panTo: PropTypes.func.isRequired
};

/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    id,
    className,
    tile: {
        publicURL, 
    },
    properties: {
        name,
        ...properties
    },
    coordinates,
    panTo
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
        const [lon, lat] = coordinates;
        setLabel(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }, []);

    /**
     * Render list of property items
     */
    return <div className={className} id={id}>
        <h1>{name}</h1>
        <label>coordinates</label>
        <p>{label}</p>
        <ul>
            {Object.entries(properties)
                .filter(([, v]) => v !== " " && !!v)
                .map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)
            }
        </ul>
        <a onClick={() => panTo(coordinates)}>{`< pan to coordinates`}</a>
        <img src={publicURL}/>
    </div>};

/**
 * The StyledLocation component is just a styled version of Location
 * that includes hover effects. 
 */
export const StyledLocation = styled(Location)`
    display: block;
    max-width: 65ch;
    padding: 1rem;
    margin: 0;
    border-radius: 5px;
    background-color: ${charcoal};
    color: ${ghost};
    
    & * {
        font-family: inherit;
        font-size: inherit;
    }

    & h1 {
        text-transform: capitalize;
        font-size: larger;
    }

    & label {
        font-style: italic;
    }
    
    & img {
        image-rendering: crisp-edges;
        width: 72px;
        filter: grayscale(100%);
        cursor: pointer;
    }

    & a {
        color: ${orange};
        display: block;
        cursor: pointer;
        margin: 0.5rem 0;
        text-decoration: underline;
    }

    &:hover {
        & img {
            filter: grayscale(0%);
        }
    }
`;

Location.displayName = "Location";
Location.propTypes = propTypes;
StyledLocation.propTypes = propTypes;
export default StyledLocation;
