
import React, { useEffect, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";

import { loadRuntime } from "../components/Canvas";

import buoys from "../../content/assets/lobster-buoys.gif";
import oysters from "../../content/assets/oyster.gif";
import boat from "../../content/assets/boat.gif";
import diver from "../../content/assets/diver-down.gif";
import fish from "../../content/assets/fish-pen.gif";
import gull from "../../content/assets/herring-gull.gif";
import lighthouse from "../../content/assets/lighthouse.gif";
import mussels from "../../content/assets/mussels.gif";
import platform from "../../content/assets/platform.gif";
import empty from "../../content/assets/empty.gif";
import wharf from "../../content/assets/wharf.gif";
import land from "../../content/assets/land.gif";


const TileSet = {
    oysters: {
        data: oysters,
        value: 10,
        probability: 0.05,
        cost: 50,
        becomes: "empty",
        dialog: "Yum!"
    },
    mussels: {
        data: mussels,
        value: 5,
        probability: 0.05,
        cost: 25,
        becomes: "empty",
        dialog: "Yum!"
    },
    platform: {
        data: platform,
        value: 40,
        probability: 0.01,
        daialog: "beep boop, science",
        limit: 1
    },
    fish: {
        data: fish,
        value: 20,
        cost: 100,
        probability: 0.02,
        becomes: "empty",
        dialog: "Yum!"
    },
    lighthouse: {
        data: lighthouse,
        value: 50,
        probability: 0.01,
        dialog: "sure is lonely out here",
        limit: 1
    },
    gull: {
        data: gull,
        probability: 0.1,
        becomes: ["fish", "oysters", "mussels"],
        dialog: "Caaaawwww."
    },
    boat: {
        data: boat,
        value: -10,
        probability: 0.03,
        limit: 1,
        becomes: "diver",
        dialog: "Diver down!"
    },
    empty: {
        data: empty,
        cost: 5,
        becomes: "buoys",
        dialog: "Maybe there are some bugs around?"
    },
    land: {
        data: land,
        probability: 0.0,
        cost: 0,
        dialog: "Can't get there from here."
    },
    buoys: {
        data: buoys,
        probability: 0.03,
        cost: 10,
        becomes: "empty"
    },
    wharf: {
        data: wharf,
        value: 0,
        probability: 0.02,
        dialog: "'ey you hear about that fire last night?",
        limit: 1
    },
    diver: {
        data: diver,
        value: -10,
        probability: 0.0,
        cost: 0,
        becomes: "boat",
        dialog: "brr, that's cold."
    }
};


/*
Canvas uses crisp-edges to preserve pixelated style of map
*/
const StyledCanvas = styled.canvas`
    display: inline-block;
    image-rendering: crisp-edges;
    left: 0;
    top: 0;
    width: 128px;
    height: 128px;
    margin: 0 0 0 0;
`;


const StyledContainer = styled.div`
    align-content: center;
    display: block;
    width: 100%;
    padding: 0;
`;


const TileDiagonal = styled.div`
    display: block; 
    align-content: center;
    width: fit-content;
    margin-right: auto;
    margin-left: auto;
    margin-bottom: -71px;
`;


const slide = (phase) => keyframes`
  0% {
    transform: translate(0px, ${`${phase}px`});
  }
  100% {
    transform: translate(0px, ${`${-phase}px`});
  }
`;


const GameTile = styled.img`
    position: relative;
    display: inline-block;
    image-rendering: crisp-edges;
    width: 96px;
    height: 96px;
    z-index: 0;
    
    animation: ${({ phase }) => {
        return slide(phase)
    }} 20s ease-in-out alternate infinite;

    &:hover {
        transform: translate(0px, -10px);
        z-index: 0;
    }
`;


const StyledText = styled.div`
    font-size: larger;
    display: inline-block;
`;


export default ({ 
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
 }) => {

    const offset = (worldSize - gridSize) / 2;

    const [tiles, setTiles] = useState(null);
    const [score, setScore] = useState(0);
    const [date, setDate] = useState(new Date(2025, 3, 1));
    const [actions, setActions] = useState(6);
    const [runtime, setRuntime] = useState(null);

    const canvasRef = useRef(null);
    const [map, setMap] = useState(null);

    const distanceFunction = (length, index) => {
        return 10 * (Math.sin(length / 2 - index) + 1);
    };

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    const build = (miniMap) => {
        const diagonals = gridSize * 2 - 1;
        const _build = [];
        let count = 0;
        miniMap.clear();
        for (let row = 0; row < diagonals; row++) {
            _build.push([]);
            const columns = (row + (row < gridSize ? 1 : diagonals - 2 * row));
            for (let column = 0; column < columns; column++) {
                let col = columns - 1 - column; // reverse the order in the index
                _build[row].push(miniMap.insert_tile(count++, row, col));
            }
            _build[row] = _build[row].reverse();
        }
        return _build
    }


    useEffect(() => {
        /*
        When the runtime loads for the first time, create a pixel map instance
        and draw the generated world to the canvas, then save the map reference
        to react state.

        Build the tileset from the random Feature table, or leave space for land.
       
        Create the probability table by accumulative discreet probabilities,
        and save the object that will be query for tile selections to react state.

        The same data structure will hold the selected tiles. 
        */
        if (!runtime || !canvasRef) return;
        let _map = new runtime.MiniMap(
            offset, 
            offset/2, 
            worldSize, 
            waterLevel, 
            canvasRef.current.getContext("2d"), 
            gridSize
        );
        Object.entries(TileSet).forEach(
            ([key, {value=0.0, probability=0.0, limit=worldSize*worldSize}]) => {
                _map.insert_feature({
                    key,
                    value, 
                    probability,
                    limit
                });
            }
        );
        setTiles(build(_map));
        setMap(_map);
    }, [runtime]);
    
    
    return (
        <StyledContainer>
            <StyledCanvas
                ref={canvasRef}
                width={worldSize}
                height={worldSize}
                onClick={({ clientX, clientY }) => {
                    const {left, top} = canvasRef.current.getBoundingClientRect();
                    const ctx = canvasRef.current.getContext("2d");
                    map.update_view(
                        ctx,
                        (clientX - left) * worldSize / 128, 
                        (clientY - top) * worldSize / 128,
                        worldSize,
                        gridSize,
                    );
                    setTiles(build(map));
                }}
            />

            <StyledText>
                <p>{date.toLocaleDateString()}</p>
                <p>Actions: {actions}</p>
                <p>Score: {map ? map.score() : 0.0 }</p>
            </StyledText>

            {((tiles || []).map((diagonal, ii) =>
                <TileDiagonal key={ii}>{
                    diagonal.map((tile, jj) => {
                        const selection = TileSet[map.get_tile(tile).feature];

                        return (<GameTile
                            phase={distanceFunction(diagonal.length, jj)}
                            key={jj}
                            src={selection.data}
                            onClick={() => {
                                if (actions) {
                                    map.replace_tile(ii, jj);
                                    setActions(actions - 1);
                                } else {
                                    console.log("bettah wait 'til tomorrow");
                                    setDate(new Date(date.setDate(date.getDate()+1)));
                                    setActions(actionsPerDay);
                                }
                                if (selection.dialog) console.log(selection.dialog);
                            }}
                        />)
                    })
                }</TileDiagonal>))}
            
        </StyledContainer>
    );
};
