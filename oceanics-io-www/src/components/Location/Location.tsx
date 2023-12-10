import React, { useState, useEffect } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { orange, ghost, shadow } from "../../palette";


export type LocationType = {
    /**
     * Handle for accessing by ID
     */
    key: string,
    /**
     * Element id for referencing from parent
     */
    id: string,
    /**
     * Class name for styled components CSS
     */
    className?: string,
    /**
     * Location metadata
     */
    properties: {
        name: string,
        nav_unit_n?: string,
        port_name?: string
    },
    /**
     * Spatial coordinates
     */
    coordinates: number[]
    /**
     * Description goes here TypeScript
     */
    tile: {
        publicURL: string, 
        anchorHash: string,
        queryString: string,
        grayscale: boolean
    }
    query: object
}

const propTypes = {
    id: PropTypes.string.isRequired,
    coordinates: PropTypes.arrayOf(PropTypes.number),
    className: PropTypes.string.isRequired,
    properties: PropTypes.shape({
        name: PropTypes.string.isRequired,
        nav_unit_n: PropTypes.string,
        port_name: PropTypes.string
    }).isRequired,
    tile: PropTypes.shape({
        publicURL: PropTypes.string.isRequired, 
        anchorHash: PropTypes.string.isRequired,
        queryString: PropTypes.string.isRequired,
        grayscale: PropTypes.bool.isRequired
    }).isRequired,
    query: PropTypes.object.isRequired
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
     * Render list of property items
     */
    return <div className={className} id={id}>
        <h1>{name}</h1>
        <p>{label}</p>
        <img src={publicURL}/>
        
        <ul>
            {Object.entries(properties)
                .filter(([, v]) => v !== " " && !!v)
                .map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)
            }
        </ul>
    </div>};

/**
 * The StyledLocation component is just a styled version of Location
 * that includes hover effects. 
 */
export const StyledLocation = styled(Location)`
    display: block;
    margin: 0;
    height: auto;
    position: relative;
    
    & * {
        font-family: inherit;
        box-sizing: border-box;
        color: ${ghost};
    }
    
    & img {
        image-rendering: crisp-edges;
        width: 72px;
        filter: grayscale(100%);
        cursor: pointer;

        &:hover {
            filter: grayscale(0%);
        }
    }

    &:hover {
        background: ${shadow};
    }
`;

Location.displayName = "Location";
Location.propTypes = propTypes;
StyledLocation.propTypes = propTypes;
export default StyledLocation;
