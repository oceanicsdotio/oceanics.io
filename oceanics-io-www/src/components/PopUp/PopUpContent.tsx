import React,  {Fragment, useState, useEffect, useCallback} from "react";
import styled from "styled-components";

type FeatureType = {
    coordinates: number[]
}
type PopUpType = {
    features: FeatureType[],
    Component: (props: FeatureType) => JSX.Element,
    className: string,
    transferCallback: (() => void) | null
}

/**
 * Base component 
 * 
 * @param param0 
 * @returns 
 */
export const PopUpContent = ({
    features, 
    Component, 
    className,
    transferCallback = null
}: PopUpType) => {
    /**
     * Array of unique species, created by parsing lease records and doing
     * some basic text processing.
     */
    // const [ species, setSpecies ] = useState(null);

    /**
     * Latitude and longitude.
     */
    const [, setCenter ] = useState([0, 0]);

    /**
     * Set the species array.
     */
    // useEffect(() => {
    //     setSpecies([...(new Set(features.flatMap(({properties}) => cleanAndParse(properties.species))))]);
    // }, []);

    const reduceFeatures = useCallback((
        [x, y]: number[], 
        {coordinates: [lon, lat]}: {coordinates: number[]}
    ) => [
        x + lon/features.length, 
        y + lat/features.length
    ], [features])

    /**
     * Set the state value for location coordinates.
     */
    useEffect(() => {
        const withCoords = features.filter((f: FeatureType) => "coordinates" in f)
        setCenter(withCoords.reduce(reduceFeatures, [0, 0]));
    }, [features]);

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
        {features.map((x: FeatureType, key: number) => 
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
