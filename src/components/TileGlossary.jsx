import React from "react";
import styled from "styled-components";
import {TileSet} from "../hooks/useOceanside";


const transformName = (name) => name.toLowerCase().split(" ").join("-"); // make the name usable as a page anchor, this will used wherever name would be
const refFromName = (name) => <a href={`#${transformName(name)}`}>{name}</a>;  // generate a link to an internal node
const refListItem = (name, end) => <>{refFromName(name)}{end ? "" : ", "}</>;  // for concatenation


const TileInfo = ({
    tile: {
        name, 
        data, 
        description=null,
        becomes,
        ...tile
    }, 
    className
}) => {
    /*
    Art and information for single tile feature. This is used by AllTiles component
    to render documentation for the game.
    */
    
    let _becomes = [];
    if (becomes) {
        _becomes = becomes.map((kk) => {
            try {
                return TileSet[kk].name;
            } catch (err) {
                throw Error(`Error on key = ${kk}`);
            }
        });
    }
   
    return <div className={className}>
        <h3>
            <a id={transformName(name)}/>
            {name}
        </h3>
        <img src={data}/>
        <p>{description}</p>
        {_becomes && _becomes.length ? 
            <p>{"Becomes: "}{_becomes.map((bb, ii) => refListItem(bb, ii === _becomes.length - 1))}</p> : 
            null
        }
        <hr/>
    </div>

};


const StyledTileInfo = styled(TileInfo)`

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

export default () => {
    /*
    Generate a helpful description of each type of tile. First alphabetize by the display name, and then
    render the individual elements.
    */    
    return <>
        {sortedByName.map((x, ii) => refListItem(x.name, ii === sortedByName.length))}
        {sortedByName.map((x, ii) => <StyledTileInfo key={ii} tile={x}/>)}
    </>
}