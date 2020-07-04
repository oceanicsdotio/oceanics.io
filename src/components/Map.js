import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import styled, {keyframes} from "styled-components";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


const loadGeoJSON = async (mapInstance, layers) => {
    /*
    Asynchronously retrieve the geospatial data files and parse them
     */
    return await Promise.all(layers.map(async ({ render, behind }) => {

        const url = "/" + render.id + ".json";

        try {
            render.source = {
                'type': 'geojson',
                'data': await fetch(url).then(r => r.json()),
                'generateId': true,
            };
        } catch {
            console.log("Error fetching " + url);
            return { layer: null, behind: null };
        }
        mapInstance.addLayer(render);
        return { layer: render.id, behind };
    }));
};


const StyledListItem = styled.li`
    color: red;
`;

const StyledOrderedList = styled.ol`
    padding-left: 20px;
`;

const shift = keyframes`
    0%     {border-color:#CCCCCC;}
    50.0%  {border-color:#77CCFF;}
    100.0%  {border-color:#CCCCCC;}
`;


const StyledMapContainer = styled.div`
    position: relative;
    display: block;
    height: 200px;
    width: 100%;
    border: solid 1px;
    color: #CCCCCC;
    padding: 3%;
    animation: ${shift} 1s linear infinite;
     
    &:hover {
        position: fixed;
        height: 90%;
        width: 90%;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
        animation: none;
    }
`;

const PopUpContent = styled.div`
    background: #101010AA;
    font-family:inherit;
    font-size: inherit;
    height: 100%;
    width: 100%;
`;

const addFeatureEvent = (mapInstance) => {
    /*
    When mouse position intersects the feature set, show a pop up that
    contains metadata information about the item.
     */

    mapInstance.on('click', 'limited-purpose-licenses', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        let coordinates = e.features[0].geometry.coordinates.slice();
        const species = e.features[0].properties.species;
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const preprocessed = species.replace('and', ',').replace(';', ',').split(',');
        const placeholder = document.createElement('div');
        
        ReactDOM.render(
            <PopUpContent>
                <StyledOrderedList>
                    {preprocessed.map(s => <StyledListItem>{s.trim()}</StyledListItem>)}
                </StyledOrderedList>
            </PopUpContent>, 
            placeholder
        );

        new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
        })
            .setLngLat(coordinates)
            .setDOMContent(placeholder)
            .addTo(mapInstance);
    });

};


const addHighlightEvent = (map, featureSet) => {
    /*
    When the cursor position interesects with the space
    defined by a feature set, set the hover state to true.

    When the cursor no longer intersects the shapes, stop
    highlighting the features. 
    */

    let featureId = null;

    map.on('mouseenter', featureSet, (e) => {
        featureId = e.features[0].id;
        map.setFeatureState({ source: featureSet, id: featureId }, { hover: true });
    });

    map.on('mouseleave', featureSet, () => {
        map.setFeatureState({ source: featureSet, id: featureId }, { hover: false });
        featureId = null;
    });
};


export default ({layers, style, radius=0}) => {

    const [map, setMap] = useState(null);
    const container = useRef(null);

    useEffect(() => {
  
        if (!map) {
            (async () => {

                const map = new mapboxgl.Map({
                    container: container.current,
                    style,
                    bearing: -30,
                    center: [-69, 44],
                    zoom: 7,
                    antialias: false,
                });

            
                map.on("mouseover", () => {
                    map.resize();
                });

                map.on("mouseleave", () => {
                    map.resize();
                });
    
                map.on("load", async () => {
                    
                    (await loadGeoJSON(map, layers.json)).map(({ layer, behind }) => map.moveLayer(layer, behind));
                    
                    // Popup events on collection of locations
                    // addFeatureEvent(map);
    
                    // Highlight shellfish closures on hover
                    addHighlightEvent(map, "nssp-closures");
    
                    // Highlight town boundaries on hover
                    addHighlightEvent(map, "maine-towns");
    
                    // Set breakpoints for point location detail markers
                    setInterval(() => {
                        const period = 64;
                        let base = radius / 16;
                        radius = (++radius) % period;
                        map.setPaintProperty(
                            'limited-purpose-licenses',
                            'circle-radius', {
                            "stops": [[base, 1], [base, 10]]
                        });
                    }, 10);
                });

                setMap(map);
            })();
        }   
    }, []);

    return <StyledMapContainer ref={el => (container.current = el)} />;
};