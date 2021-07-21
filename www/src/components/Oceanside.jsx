import React from "react";
import styled from "styled-components";

import useOceanside from "../hooks/useOceanside";
import useOceansideWorld from "../hooks/useOceansideWorld";

const Hidden = styled.canvas`
    display: none;
`;

const Board = styled.canvas`
    position: relative;
    width: 100%;
    image-rendering: crisp-edges;
    min-height: 400px;
`;


export default ({
    gridSize = 7,
    worldSize = 32,
    waterLevel = 0.7
}) => {

    const world = useOceansideWorld({
        gridSize,
        worldSize,
        waterLevel,
    });
    const board = useOceanside({
        map: world.map, 
        gridSize, 
        worldSize});
    // const overlay = useOceansideOverlay({gridSize}); 

    return <>
        <Hidden ref={world.ref} onClick={world.onClick}/>
        <Board ref={board.ref}/>
    </>
}