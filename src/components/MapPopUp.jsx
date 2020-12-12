import React, {useRef} from "react";
import styled from "styled-components";
import useHistogramCanvas from "../hooks/useHistogramCanvas";


export const PopUpContent = styled.div`

    background: #101010AA;
    font-family: inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > canvas {
        width: 200px;
        height: 75px;
        display: block;
        border-bottom: 1px solid ${({fg="#ccc"})=>fg};
    }

    & > div {
        overflow-y: scroll;
        max-height: 300px;
        height: fit-content;

        & > ul {
            padding: 0;

            & > li {
                color: #CCCCCCFF;
                margin: 0;
                padding: 0;
                display: block;
            }
        }
    }
`;


const LicenseInformation = ({ features }) =>
    <>
        {features.map(({ species, coordinates: [lon, lat] }, key) => 
            <div key={key}>
                <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                <ul>
                    {species.map(each => <li key={each}>{each}</li>)}
                </ul>
            </div>
        )}
    </>;


const LeaseInformation = ({ features }) =>
    <>
        {features.map(({ species }, key) => 
            <div key={key}>
                <ul>
                    {species.map(each => <li key={each}>{each}</li>)}
                </ul>
            </div>
        )}
    </>;
   

const PortInfo = ({ features }) => 
    <>
        {features.map(({ properties, coordinates: [lon, lat] }, key) =>
            <div key={key}>
                <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                <ul>
                    {Object.entries(properties).map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)}
                </ul>
            </div>
        )}
    </>;


const SuitabilityInfo = ({ histogram, foreground="#CCCCCCFF"}) => {
    /*
    Suitability aggregation features are histograms drawn to a canvas.
    */
    const {total, ref} = useHistogramCanvas({ref, histogram, foreground});

    return <>
        <canvas ref={ref} fg={foreground}/>
        <div>{`Oyster Suitability (N=${total})`}</div>
    </>
    
};


export const licenseHandler = ({features, lngLat: {lng}}) => {
   
    let center = [0, 0];
    const _features = features.map(({geometry: {coordinates}, properties: {species}}) => {

        while (Math.abs(lng - coordinates[0]) > 180) coordinates[0] += lng > coordinates[0] ? 360 : -360;
        coordinates.forEach((dim, ii)=>{center[ii] += dim / features.length});

        return {
            species: species.replace('and', ',').replace(';', ',').split(',').map(each => each.trim()),
            coordinates
        }
    });

    return Object({
        closeButton: false,
        jsx: <LicenseInformation features={_features}/>,
        coordinates: center
    });
};

export const portHandler = ({features, lngLat: {lng}}) => {
  
    let center = [0, 0];

    const parse = ({geometry: {coordinates}, properties}) => {
       
        while (Math.abs(lng - coordinates[0]) > 180) {
            coordinates[0] += lng > coordinates[0] ? 360 : -360;
        }
        coordinates.forEach(
            (dim, ii)=> { center[ii] += dim / features.length}
        );

        return {
            properties,
            coordinates
        }
    }

    return {
        closeButton: false,
        jsx: <PortInfo features={features.map(parse)}/>,
        coordinates: center
    };
};

export const suitabilityHandler = ({
    features, lngLat: {lng, lat}
}) => {
    console.log("suitability");
    const {
        properties: {
            histogram
        }
    } = features[0];
    return Object({
        closeOnClick: true,
        jsx: <SuitabilityInfo histogram={JSON.parse(histogram)}/>,
        coordinates: [lng, lat]
    })};
  

export const nsspHandler = ({
    features, 
    lngLat: {lng, lat}
}) => 
    Object({
        jsx: <p>{
            features.length > 1 ? 
            `Shellfish sanitation areas (${features.length})` : 
            `Shellfish sanitation area`
            }</p>,
        coordinates: [lng, lat]
    });   



export const leaseHandler = ({
    features, 
    lngLat: {
        lng, 
        lat
    }}) => {

    const parse = ({properties: {species}}) => Object({
        species: 
            species
                .replace('and', ',')
                .replace(';', ',')
                .split(',')
                .map(each => each.trim())
        });
    
    return {
        jsx: <LeaseInformation features={features.map(parse)}/>,
        coordinates: [lng, lat]
    };
        
};


export const popups = {
    port: portHandler,
    license: licenseHandler,
    lease: leaseHandler,
    suitability: suitabilityHandler,
    nssp: nsspHandler
};