import React, {Dispatch, SetStateAction} from "react";
import styled from "styled-components";

import Channel, {ChannelType} from "./Channel";
import Trifold from "./Trifold";
import { grey, orange } from "../../palette";


export type CatalogType = {
    /**
     * Placement in horizontal grid
     */
    column: number
    /**
     * Metadata about data sources
     */
    channels: ChannelType[]
    /**
     * Styuled components name
     */
    className?: string
    /**
     * Current zoom level
     */
    zoomLevel: number
    /**
     * Pass in an existing queue
     */
    queue: ChannelType[];
    /**
     * Replace me a reducer
     */
    setQueue: Dispatch<SetStateAction<ChannelType[]>>;
}

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
export const Catalog = ({
    className, 
    zoomLevel
}: CatalogType) => {
   
    /**
     * List of collections to build selection from.
     * 
     * If there is no `behind`, can be inserted in front, otherwise need to find the index
     * of the behind value, and insert after.
     */ 
    // const validLayerOrder = (channels: ChannelType[]) => {

    //     // Memoize just ID and BEHIND
    //     const triggers = {};

    //     // Queue to build
    //     const layerQueue: number[] = [];

    //     channels.forEach(({behind=null, id}) => {
            
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
        
    
    return (
        <div className={className}>
            <Channel 
                zoomLevel={zoomLevel}
                id="home"
                url="www.oceanics.io"
                maxzoom={21}
                minzoom={1}
                type="point"
                component="Location"
                info="www.oceanics.io"
                onClick={()=>{console.log("click")}}
            />
        </div>
    )
}; 

export const StyledCatalog = styled(Catalog)`
    grid-row: 1;
    grid-column: ${({ column }) => column + 1};
    border: 1px dashed ${grey};
    overflow-x: hidden;
    overflow-y: hidden;
    height: 100vh;
    width: auto;
    min-height: 100vh;
    bottom: 0;
    margin: 0.5rem;
    padding: 0;
`;

Catalog.displayName = "Catalog";
export default StyledCatalog;