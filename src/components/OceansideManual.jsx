import React from "react";
import styled from "styled-components";
import {TileSet} from "../hooks/useOceanside";


const TileTitle = styled.h3`
    color: orange;
`;
  
const GameTile = styled.img`
    position: relative;
    display: inline-block;
    image-rendering: crisp-edges;
    width: 96px;
    height: 96px;
`;

const transformName = (name) => name.toLowerCase().split(" ").join("-"); // make the name usable as a page anchor, this will used wherever name would be
const refFromName = (name) => <a href={`#${transformName(name)}`}>{name}</a>;  // generate a link to an internal node
const refListItem = (name, end) => <>{refFromName(name)}{end ? "" : ", "}</>;  // for concatenation


const TileInfo = ({tile}) => {
    /*
    Art and information for single tile feature. This is used by AllTiles component
    to render documentation for the game.
    */
    if (!tile.name || !tile.data) {
        throw Exception(`Missing data:${tile}`);
    }
    let becomes = [];
    let keys = tile.becomes;
    if (keys) {
        becomes = keys.map((kk) => {
            try {
                return TileSet[kk].name;
            } catch (err) {
                throw Error(`Error on key = ${kk}`);
            }
        });
    }
   
    return (<>
        <TileTitle><a id={transformName(tile.name)}/>{tile.name}</TileTitle>
        <GameTile src={tile.data}/>
        {tile.description ? <p>{tile.description}</p> : null}
        {becomes && becomes.length ? 
            <p>{"Becomes > "}{becomes.map((bb, ii) => refListItem(bb, ii === becomes.length - 1))}</p> : 
            null
        }
        <hr/>
    </>)

};

export default () => {
    /*
    Generate a helpful description of each type of tile. First alphabetize by the display name, and then
    render the individual elements.
    */    
    let sortedByName = Object.values(TileSet).sort((a, b) => {
        [a, b] = [a, b].map(x => transformName(x.name));
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });

    return (<>
        {sortedByName.map((x, ii) => refListItem(x.name, ii === sortedByName.length))}
        {sortedByName.map((x, ii) => <TileInfo key={ii} tile={x}/>)}
    </>)
}