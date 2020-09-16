
import React, { useEffect, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";

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


const Spacer = styled.div`
    position: relative;
    display: inline-block;
    width: 96px;
    height: 96px;
`;


const StyledText = styled.div`
    font-size: larger;
    display: inline-block;
`;


export default ({ gridSize = 8, worldSize = 32, waterLevel = 0.7 }) => {

    const [tiles, setTiles] = useState(null);
    const [world, setWorld] = useState(null);
    const [view, setView] = useState(null);
    const [visible, setVisible] = useState(null);
    const [score, setScore] = useState(0);
    const [date, setDate] = useState(new Date(2025, 3, 1));
    const [actions, setActions] = useState(6);

    const canvasRef = useRef(null);

    const offset = (worldSize - gridSize) / 2;

    const distanceFunction = (length, index) => {
        return 10 * (Math.sin(length / 2 - index) + 1);
    };

    const swapTiles = (ii, jj, feature=null, cost=0) => {
        return () => {
            if (tiles && actions) {
                const newTiles = [...tiles];
                const [previous, flip] = newTiles[ii][jj];
                const _feature = feature ? feature : Feature();
                
                newTiles[ii][jj] = [_feature, flip];

                setTiles(newTiles);
                setScore(score - TileSet[previous].value + TileSet[_feature].value - cost);
                setActions(actions - 1);

            } else {
                console.log("bettah wait 'til tomorrow")
            }
        }
    };


    const TileSet = {
        oysters: {
            data: oysters,
            value: 10,
            probability: 0.05,
            onClick: (ii, jj) => swapTiles(ii, jj, "empty", -50)
        },
        mussels: {
            data: mussels,
            value: 5,
            probability: 0.05,
            onClick: (ii, jj) => swapTiles(ii, jj, "empty", -25)
        },
        platform: {
            data: platform,
            value: 40,
            probability: 0.01,
            onClick:  () => () => {console.log("beep boop, science")},
            limit: 1
        },
        fish: {
            data: fish,
            value: 20,
            probability: 0.02,
            onClick: (ii, jj) => swapTiles(ii, jj, "empty", -100)
        },
        lighthouse: {
            data: lighthouse,
            value: 50,
            probability: 0.01,
            onClick:  () => () => {console.log("sure is lonely out here")},
            limit: 1
        },
        gull: {
            data: gull,
            value: 0,
            probability: 0.1,
            onClick: swapTiles
        },
        boat: {
            data: boat,
            value: -10,
            probability: 0.03,
            limit: 1,
            onClick: (ii, jj) => swapTiles(ii, jj, "diver")
        },
        empty: {
            data: empty,
            value: 0,
            probability: null,
            onClick: (ii, jj) => swapTiles(ii, jj, "buoys", 5)
        },
        buoys: {
            data: buoys,
            value: 0,
            probability: 0.03,
            onClick: (ii, jj) => swapTiles(ii, jj, "empty", -10)
        },
        wharf: {
            data: wharf,
            value: 0,
            probability: 0.02,
            onClick: () => () => {console.log("'ey you hear about that fire last night?")},
            limit: 1
        },
        diver: {
            data: diver,
            value: -10,
            probability: null,
            onClick: (ii, jj) => swapTiles(ii, jj, "boat")
        }
    };

    const Feature = (counts=null) => {
        /*
        Use TileSet object as a probability table. Generate a random number
        and iterate through the table until a feature is chosen. Assign the empty
        tile by default.
        
        Need to scan over the whole thing to check if the
        probability > 1.0. That would indicate a logical error in the TileSet
        configuration.
        */
        const random = Math.random();
        let cummulativeProbability = 0.0;
        let feature = "empty";
        let setFeature = true;

        Object.entries(TileSet).forEach(
            ([key, { probability, limit }], ii) => {
                if (counts && key in counts && counts[key] >= limit) {
                    return;
                }

                if (probability && (random < (cummulativeProbability + probability))) {
                    if (setFeature) {
                        feature = key;
                        setFeature = false;
                    }
                }
                cummulativeProbability += probability;
            }
        );

        if (cummulativeProbability > 1.0) {
            console.log(`Total probability (${cummulativeProbability}) is greater than 1.0`);
        }

        return feature;
    };


    useEffect(() => {
        /*
        If canvas is ready, create an image buffer and randomly generate
        the world.

        A noise term and a object function are combined to create a land/water mask. This
        approximates an island. 
        
        The alpha channel is used when rendering the game board to
        determine whether or not to create a water feature.
        */

        if (canvasRef) {

            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            const imagedata = ctx.createImageData(worldSize, worldSize);
            const quadrant = worldSize / 2;
            const limit = Math.sqrt(2 * quadrant ** 2);

            for (let ii = 0; ii < worldSize; ii++) {
                for (let jj = 0; jj < worldSize; jj++) {

                    const noise = 0.1 * Math.random();
                    const distance = 1.0 - Math.sqrt((quadrant - ii) ** 2 + (quadrant - jj) ** 2) / limit;
                    const elevation = Math.min(distance ** 2 + noise, 1.0);
                    const mask = 255 * (elevation < waterLevel);
                    const pixelIndex = (jj * worldSize + ii) * 4;

                    imagedata.data[pixelIndex] = mask * Math.random() * 0.4;
                    imagedata.data[pixelIndex + 1] = mask * 0.8 * (1.0 - (waterLevel - elevation));
                    imagedata.data[pixelIndex + 2] = mask * (1.0 - (waterLevel - elevation));
                    imagedata.data[pixelIndex + 3] = mask;
                }
            }
            setView([offset, offset / 2]);
            setWorld(imagedata);
        }
    }, []);

    useEffect(() => {
        /*
        Once the navigation minimap has loaded, draw the world and the current view.
        */
        if (canvasRef && world && view) {
            const boundingBox = gridSize + 2;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            ctx.putImageData(world, 0, 0);

            const viewPort = ctx.getImageData(view[0] + 1, view[1] + 1, gridSize, gridSize);
            const imageData = ctx.createImageData(boundingBox, boundingBox);
            for (let ii = 0; ii < boundingBox; ii++) {
                for (let jj = 0; jj < boundingBox; jj++) {
                    const pixelindex = (jj * boundingBox + ii) * 4;
                    imageData.data[pixelindex] = 0;
                    imageData.data[pixelindex + 1] = 0;
                    imageData.data[pixelindex + 2] = 0;
                    imageData.data[pixelindex + 3] = 255;
                }
            }
            ctx.putImageData(imageData, ...view);
            ctx.putImageData(viewPort, view[0] + 1, view[1] + 1);
            setVisible(viewPort);
        }
    }, [view]);

    useEffect(() => {
        /*
        Build the tileset from the random Feature table, or leave space for land.
        */
        if (!visible) return;
    
        let landMask = [];
        const diagonals = gridSize * 2 - 1;
        const build = [];
        const featureCount = {};

        for (let ii = 1; ii < 2 * gridSize; ii++) {
            const column = Math.max(0, ii - gridSize);
            const count = Math.min(ii, (gridSize - column), gridSize);
            for (let jj = 0; jj < count; jj++) {
                const index = ((column + jj) * gridSize + Math.min(gridSize, ii) - jj - 1) * 4 + 3;
                landMask.push(visible.data[index] / 1000);
            }
        }

        let count = 0;
        let total = 0;
        for (let ii = 0; ii < diagonals; ii++) {
            build.push([]);
            const stop = (ii + (ii < gridSize ? 1 : diagonals - 2 * ii));
            for (let jj = 0; jj < stop; jj++) {
                let data;
                if (landMask[count++]) {
                    const flip = Math.random() > 0.5;
                    const feature = Feature(featureCount);
                    if (!(feature in featureCount)) featureCount[feature] = 0;
                    featureCount[feature]++
                    data = [feature, flip];
                    total += TileSet[feature].value;
                } else {
                    data = [null, null];
                }
                build[ii].push(data);
            }
            build[ii] = build[ii].reverse();
        }

        setTiles(build);
        setScore(total);

    }, [visible]);

    useEffect(()=>{
        if (date && !actions) {
            setDate(new Date(date.setDate(date.getDate()+1)));
            setActions(6);
        }
    },[actions]);


    return (
        <StyledContainer>
            <StyledCanvas
                ref={canvasRef}
                width={worldSize}
                height={worldSize}
                onClick={({ clientX, clientY }) => {
                    setView([clientX * worldSize / 128, clientY * worldSize / 128]);
                }}
            />
            <StyledText>
                <p>{date.toLocaleDateString()}</p>
                <p>Actions: {actions}</p>
                <p>Score: {score}</p>
            </StyledText>

            {(tiles || []).map((diagonal, ii) =>
                <TileDiagonal key={ii}>{
                    diagonal.map(([tile], jj) => (
                        tile ?
                            <GameTile
                                phase={distanceFunction(diagonal.length, jj)}
                                key={jj}
                                src={TileSet[tile].data}
                                onClick={TileSet[tile].onClick(ii, jj)}
                            /> :
                            <Spacer key={jj} />
                    ))
                }</TileDiagonal>
            )}
        </StyledContainer>
    );
};


