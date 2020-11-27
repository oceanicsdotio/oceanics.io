import {useEffect, useState} from "react";

export default ({
    render: {
        id, 
        url=null,
        ...render
    }, 
    behind,
    map,
    popup=null
}) => {

    /**
    Asynchronously retrieve the geospatial data files and parse them.

    Skip this if the layer data has already been loaded, or if the map doesn't exist yet
    */

    const [metadata, setMetadata] = useState(null);
    
    useEffect(() => {
        
        if (!map) return;

        (async () => {
        
            const data = await fetch(url ? url : `/${id}.json`)
                .then(response => response.text())
                .then(text => JSON.parse(text));

            try {
                map.addLayer({
                    id, 
                    ...render, 
                    source: {
                        type: "geojson", 
                        data,
                        generateId: true
                    }});
                setMetadata({id, behind});
            } catch (err) {
                console.log(err);
                console.log("Error adding layer", layerData);
            }
                      
        })();
       
    }, [map]);

     /* 
    Generate effect hooks for each layer that has an onclick event handler 
    */
    
    useEffect(() => {
        if (!metadata || !map || !popup) return
        
        map.on('click', id, (e) => {
            popup(e).addTo(map)}
        );       
    }, [metadata, map]);

    return metadata
};