import React from "react";
import styled from "styled-components";

import LayerCard from "./LayerCard";

/**
 * Predefined colors.
 */
import { ghost, pink, grey } from "./palette";

/**
The key is the Entity subclass. 
The props are the properties of the collection itself.

1. check that there is data stored in React state.
2. if not return an empty list
3. serialize the items, if any, and create a table within the outer list. 

 * The Storage component provides and interface to view
 * S3 object storage assets. 
 * The catalog page is like a landing page to the api.
* Assets are files, usually remote, in this case stored in 
 * S3 object storage. 
 * In S3 storage objects are grouped by prefix. In our system
 * this is interpreted as thematic or topological collections.
 * This is somewhat analogous to the STAC specification.
Routes from here correspond to entities and 
collections in the graph database.
 */
const Catalog = ({geojson, className, zoomLevel, queue, setQueue}) => {
   
    /**
     * List of collections to build selection from.
     * 
     * If there is no `behind`, can be inserted in front, otherwise need to find the index
     * of the behind value, and insert after.
     */ 
    // const validLayerOrder = (geojson) => {

    //     // Memoize just ID and BEHIND
    //     const triggers = {};

    //     // Queue to build
    //     const layerQueue = [];

    //     geojson.forEach(({behind=null, id}) => {
            
    //         // no behind value
    //         if (behind === null) {
    //             queue.push(id);
    //             return;
    //         }

    //         // find behind value
    //         const ind = layerQueue.findIndex(behind);
        
    //         if (ind === -1) {
    //             if (behind in triggers) {
    //                 triggers[behind].push(id)
    //             } else {
    //                 triggers[behind] = [id]
    //             }
    //             return;
    //         } 

    //         layerQueue.splice(ind+1, 0, id);

    //     });
    // }
        
    
    return <div className={className}>
        <LayerCard {...{id: "home"}}/>
        <LayerCard {...{id: "Gulf of Maine"}}/>
        {geojson.map(({id, ...layer}) => {

            const onClick = () => {
                setQueue([...(queue||[]), {id, ...layer}]);
            };

            return <LayerCard {...{...layer, id, key: id, zoomLevel, onClick}}/>
        })}
    </div> 
}; 

/**
 * Styled version of the Single day calendar view
 */
const StyledCatalog = styled(Catalog)`

    width: auto;
    min-height: 100vh;
    bottom: 0;
    margin: 0.5rem;
    padding: 0;

`;

export default StyledCatalog;