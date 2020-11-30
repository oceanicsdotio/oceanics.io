import React, {useState, useEffect} from "react"
import styled from "styled-components";
import Table from "./Table";
import Form from "./Form";
import useObjectStorage from "../hooks/useObjectStorage";
import useBathysphereApi from "../hooks/useBathysphereApi";
import {grey} from "../palette";
import {TileSet} from "../hooks/useOceanside";
import Tags from "./Tags";


// make the name usable as a page anchor
const transformName = name => 
    name.toLowerCase().split(" ").join("-"); 


const TileInfo = ({
    tile: {
        name, 
        data, 
        description=null,
        becomes=[]
    }, 
    className
}) => {
    /*
    Art and information for single tile feature. This is used by AllTiles component
    to render documentation for the game.
    */
    return <div className={className}>
        <h3>
            <a id={transformName(name)}/>
            {name}
        </h3>
        <img src={data}/>
        <p>{description}</p>
        {becomes.length ? 
            <p>
                {"Becomes: "}
                <Tags group={
                    becomes
                        .map(x => TileSet[x])
                        .map(({name}) => Object({
                            link: `#${transformName(name)}`,
                            text: name
                        }))
                    }
                />
            </p> : 
            null
        }
    </div>

};


const StyledTileInfo = styled(TileInfo)`

    border-bottom: 0.1rem solid ${grey};

    & > * {
        font-size: inherit;
        font-family: inherit;
    }

    & > img {
        position: relative;
        image-rendering: crisp-edges;
        width: 64px;
        height: 64px;
    }  
`;
  
const sortedByName = Object.values(TileSet).sort((a, b) => {
    [a, b] = [a, b].map(x => transformName(x.name));
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
});

/*
Generate a helpful description of each type of tile. First alphabetize by the display name, and then
render the individual elements.
*/    


const schema = [{
    label: "key",
    type: "string"
},{
    label: "size",
    type: "float",
    parse: parseInt,
    // format: (x) => { return `${x.toFixed(1)}` }
},{
    label: "updated",
    type: "datetime"
}];


/**
The key is the Entity subclass. 
The props are the properties of the collection itself.

1. check that there is data stored in React state.
2. if not return an empty list
3. serialize the items, if any, and create a table within the outer list. 
*/


/**
 * The Storage component provides and interface to view
 * S3 object storage assets. 
 * The catalog page is like a landing page to the api.
* Assets are files, usually remote, in this case stored in 
 * S3 object storage. 
 * In S3 storage objects are grouped by prefix. In our system
 * this is interpreted as thematic or topological collections.
 * This is somewhat analogous to the STAC specificiation.
Routes from here correspond to entities and 
collections in the graph database.
 */
const Catalog = ({
    
    graph: {
        accessToken,
        url = "https://graph.oceanics.io/api/"
    },
    storage: {
        delimiter="/",
        target
    }
}) => {

    // List of collections to build selection from
    const {catalog} = useBathysphereApi({accessToken, url});
    const [options, setOptions] = useState([]);
    const [records, setRecords] = useState([]);
    const fs = useObjectStorage({
        target: `${target}?delimiter=${delimiter}`
    });

    useEffect(()=>{
        if (!fs || !catalog) return;

        const combined = [
            {key: "Features of Interest"}, 
            ...fs.collections, 
            ...catalog
        ];
        setOptions(combined.map(({key})=>key));
        setRecords(fs.assets);
    }, [fs, catalog]);


    return <>
        <Form
            fields={[{
                type: "select",
                id: "Collections",
                options
            }]}
        />
        <Form
            fields={[{
                type: "select",
                id: "Assets",
                options: sortedByName.map(x => x.name)
            }]}
        />
        {sortedByName.map((x, ii) => <StyledTileInfo key={`tile-${ii}`} tile={x}/>)}
        {/* <Table records={catalog}/> */}
    </> 
}; 


export default Catalog;