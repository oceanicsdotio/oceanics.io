import React, { useRef } from "react";
import styled from "styled-components";
import useOceanside from "../hooks/useOceanside";

/*
Canvas uses crisp-edges to preserve pixelated style of map.
*/
const StyledCanvas = styled.canvas`
    display: inline-block;
    image-rendering: crisp-edges;
    position: relative;
    left: 0;
    bottom: 0;
    width: 128px;
    height: 128px;
    margin: 10px;
    border: orange 1px solid;
`;

const StyledBoard = styled.canvas`
    display: inline-block;
    image-rendering: pixelated;
    position: relative;
    left: 0;
    top: 0;
    width: 600px;
    height: 600px;
    margin: 0;
    border: none;
    cursor: none;
`;



const Oceanside = ({className}) => {
    /*
    The `Oceanside` component contains all of the functionality to
    embed the game in any web page using React.
    
    It consists of two canvases and a text block inside a container 
    <div>. One canvas displays the navigation minimap, and the other
    is where the animated game tiles are rendered. The text block
    displays the current datetime and score. 

    The properties change game play in the following ways...

    * The number of tiles visible is the square of `gridSize`, 
    so scores are higher for larger values.

    * The total number of tiles, and therefore the probability of 
    finding certain features, is the square of `worldSize`. 

    * Each tile has an elevation value. Tiles above `waterLevel` 
    are always land, and therfore worth nothing. 
    Other wet tiles become mud depending on the tidal cycle and their
    elevation.

    * The `actionsPerDay` property determines how quickly time passes,
    and how many things you can interact with per day. This ultimately
    puts a limit on the score you can earn.

    * The `startDate` and `endTurnMessage` props currently have no 
    effect on game play. 

    */

    const nav = useRef(null);  // minimap for navigation
    const board = useRef(null);  // animated GIF tiles
    const {takeAnActionOrWait, } = useOceanside({nav, board});

    return <div className={className}>
        <div>
            {`${clock.date.toLocaleDateString()} ${18-2*(clock.actions ? clock.actions : 0)}:00, Balance: $${map ? map.score() : 0.0}`}
        </div>

        <StyledBoard
            ref={board}
            onClick={(event) => {
                event.persist(); // otherwise React eats it
                try {
                    takeAnActionOrWait(event);
                } catch (err) {
                    console.log(err);
                }
            }}
        />
        
        <StyledCanvas
            ref={nav}
            width={worldSize}
            height={worldSize}
            onClick={(event) => {
                event.persist();
                populateVisibleTiles(map, event, nav);
            }}
        />    
    </div>
};

export const StyledOceanside = styled(Oceanside)`

    align-content: center;
    display: block;
    width: 100%;
    height: 600px;
    padding: 0;

    & > div {
        font-size: larger;
        display: block;
        position: absolute;
        margin: 5px;
        z-index: 1;
    }

`;

export default StyledOceanside;
