import React,  {Fragment, useState, useEffect} from "react";
import styled from "styled-components";


export const PopUpContent = ({
    features, 
    Component, 
    className,
    transferCallback = null
}) => {

    /**
     * Array of unique species, created by parsing lease records and doing
     * some basic text processing.
     */
    const [ species, setSpecies ] = useState(null);

    /**
     * Latitude and longitude.
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

    return <div 
        className={className}
        onDragOver={event => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
        }}
        onDrop={event => {
            event.preventDefault();
            if (transferCallback) transferCallback();
        }}
    >
        {features.map((x, key) => 
            <Fragment key={key}>
                <Component {...x}/>
            </Fragment>
        )}
    </div>
};

const StyledPopUpContent = styled(PopUpContent)`

    background: #000000FF;
    font-family: inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > div {
        overflow-y: scroll;
        max-height: 75vh;
        height: fit-content;
        padding: 0.5rem;
        background: none;

        & > canvas {
            width: 200px;
            height: 75px;
            display: block;
            padding: 0;
            margin: 0;
            border-bottom: 1px solid ${({fg="#ccc"})=>fg};
            image-rendering: crisp-edges;
        }

        & > ul {
            padding: 0;
            margin: 0;

            & > li {
                color: #CCCCCCFF;
                margin: 0;
                padding: 0;
                display: block;
            }
        }
    }
`;

export default StyledPopUpContent;
