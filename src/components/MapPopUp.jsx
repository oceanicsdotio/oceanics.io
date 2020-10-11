import React, {useRef, useEffect, useState} from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import {Popup} from "mapbox-gl";


const PopUpContent = styled.div`
    background: #101010AA;
    font-family:inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;
`;

const ScrollBox = styled.div`
    overflow-y: scroll;
    max-height: 300px;
    height: fit-content;
`;

const StyledListItem = styled.li`
    color: #CCCCCCFF;
    margin: 0;
    padding: 0;
    display: block;
`;

const StyledUnorderedList = styled.ul`
    padding: 0;
`;

const HistogramCanvas = styled.canvas`
    width: 200px;
    height: 75px;
    display: block;
    border-bottom: 1px solid ${({fg})=>fg};
`;

const StyledLabel = styled.div`
    color: ${({fg})=>fg};
`

const LicenseInformation = ({ features }) => {
    return (
        <PopUpContent>
            {features.map(({ species, coordinates: [lon, lat] }, key) => {
                return (<div key={key}>
                    <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                    <StyledUnorderedList>
                        {species.map(each => <StyledListItem key={each}>{each}</StyledListItem>)}
                    </StyledUnorderedList>
                </div>)
            })}
        </PopUpContent>
    )
};


const LeaseInformation = ({ features }) => {

    return (
        <PopUpContent>
            {features.map(({ species }, key) => {
                return (<div key={key}>
                    <StyledUnorderedList>
                        {species.map(each => <StyledListItem key={each}>{each}</StyledListItem>)}
                    </StyledUnorderedList>
                </div>)
            })}
        </PopUpContent>
    )
};

const PortInfo = ({ features }) => {

    return (
        <PopUpContent>
            <ScrollBox>
            {features.map(({ properties, coordinates: [lon, lat] }, key) => {
                return (<div key={key}>
                    <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                    <StyledUnorderedList>
                        {Object.entries(properties).map(([jj, item]) => <StyledListItem key={jj}>{`${jj}: ${item}`}</StyledListItem>)}
                    </StyledUnorderedList>
                </div>)
            })}
            </ScrollBox>
        </PopUpContent>
    )
};


const SuitabilityInfo = ({ histogram, foreground="#CCCCCCFF"}) => {
    /*
    Suitability aggregation features are histograms drawn to a canvas.
    */
    const ref = useRef(null);
    const [total, setTotal] = useState(0);

    useEffect(()=>{
        /*
        Draw histogram peaks to the canvas when it loads
        */
        const ctx = ref.current.getContext("2d");
        const {width, height} = ref.current;
        ctx.fillStyle = foreground;
        let previousX = 0;
        let _total = 0;

        const maxValue = Math.max(...histogram.map(([_, count])=>{return count}));
        
        histogram.forEach(([bin, count], ii) => {

            ctx.fillRect(
                previousX * width,
                height,
                width/100,
                -(count * height / maxValue) 
            );
            previousX = bin;
            _total += count;
        });

        setTotal(_total);
    },[]);

    return (
        <PopUpContent>
            <HistogramCanvas ref={ref} fg={foreground}/>
            <StyledLabel>{`Oyster Suitability (N=${total})`}</StyledLabel>
        </PopUpContent>
    )
};


const ClosedArea = ({features}) => {
    return (
        <PopUpContent>
            <p>{features.length > 1 ? `Shellfish sanitation areas (${features.length})` : "Shellfish sanitation area"}</p>
        </PopUpContent>
    )
}


const genericPopUp = ({jsx, coordinates, closeButton=true, closeOnClick=true}) => {
    const placeholder = document.createElement('div');
    ReactDOM.render(jsx, placeholder);

    return new Popup({
        className: "map-popup",
        closeButton,
        closeOnClick
    })
        .setLngLat(coordinates)
        .setDOMContent(placeholder)
}

export const licenseHandler = (e) => {
    /*
    
    */
    let center = [0, 0];
    const features = e.features.map(({geometry: {coordinates}, properties: {species}}) => {

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        coordinates.forEach((dim, ii)=>{center[ii] += dim / e.features.length});

        return {
            species: species.replace('and', ',').replace(';', ',').split(',').map(each => each.trim()),
            coordinates
        }
    });

    return genericPopUp({
        closeButton: false,
        jsx: <LicenseInformation features={features}/>,
        coordinates: center
    });
}

export const portHandler = (e) => {
    /*
    
    */
    let center = [0, 0];
    const features = e.features.map(({geometry: {coordinates}, properties}) => {
       
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        coordinates.forEach((dim, ii)=>{center[ii] += dim / e.features.length});

        return {
            properties,
            coordinates
        }
    });

    console.log(features);

    return genericPopUp({
        closeButton: false,
        jsx: <PortInfo features={features}/>,
        coordinates: center
    });
}

export const suitabilityHandler = (e) => {

    const {properties: {histogram}, geometry: {coordinates}} = e.features[0]; 

    return genericPopUp({
        closeOnClick: false,
        jsx: <SuitabilityInfo histogram={JSON.parse(histogram)}/>,
        coordinates
    });
        
}

export const nsspHandler = (e) => {

    const {lng, lat} = e.lngLat;

    return genericPopUp({
        jsx: <ClosedArea features={e.features}/>,
        coordinates: [lng, lat]
    });
        
}



export const leaseHandler = (e) => {

    const {lng, lat} = e.lngLat;
    const features = e.features.map(({properties: {species}}) => {
        return {
            species: species.replace('and', ',').replace(';', ',').split(',').map(each => each.trim())
        }
    });

    return genericPopUp({
        jsx: <LeaseInformation features={features}/>,
        coordinates: [lng, lat]
    });
        
}

