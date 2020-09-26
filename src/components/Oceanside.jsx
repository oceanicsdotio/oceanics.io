
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";

import { loadRuntime } from "../components/Canvas";


const createImageRef = (data) => {
    let img = new Image();
    img.src = data;
    return img
};

export const TileSet = {
    oysters: {
        data: require("../../content/assets/oyster.gif"),
        spriteSheet: createImageRef(require("../../content/assets/oyster.png")),
        name: "Oysters",
        value: 10,
        probability: 0.05,
        cost: 50,
        becomes: ["empty"],
        dialog: "Yum!",
        description: (
            "Oysters are delicious! Leave them in the water and collect the reward, or harvest the whole bed and sell it. " +
            ""
        )
    },
    mussels: {
        data: require("../../content/assets/mussels.gif"),
        spriteSheet: createImageRef(require("../../content/assets/mussels.png")),
        name: "Mussels",
        value: 5,
        probability: 0.05,
        cost: 25,
        becomes: ["empty"],
        dialog: "Yum!",
        description: "Mussels are good! If they are too close to oysters though, they will eventually take over."
    },
    platform: {
        data: require("../../content/assets/platform.gif"),
        spriteSheet: createImageRef(require("../../content/assets/platform.png")),
        name: "Laboratory",
        value: 40,
        probability: 0.01,
        dialog: "beep boop, science",
        limit: 1,
        description: (
            "The laboratory reveals gulls. Sometime if you are really nice and bring the scientists seafood they will " +
            "publish a paper revealing the nature of things. " 
        )
    },
    fish: {
        data: require("../../content/assets/fish-pen.gif"),
        spriteSheet: createImageRef(require("../../content/assets/fish-pen.png")),
        name: "Fish Pen",
        value: 20,
        cost: 100,
        probability: 0.02,
        becomes: ["empty"],
        dialog: "Yum!",
        description: (
            "Finfish are valuable, but be careful, bad things can happen if they escape. "+
            "If the sea lice get to be too much, you should talk to the scientists at the laboratory "+
            "about collaborating on a paper."
        )
    },
    lighthouse: {
        data: require("../../content/assets/lighthouse.gif"),
        spriteSheet: createImageRef(require("../../content/assets/lighthouse.png")),
        name: "Lighthouse",
        value: 50,
        probability: 0.01,
        dialog: "Sure is lonely out here.",
        limit: 1,
        description: (
            "The Lighthouse has been around forever. "+
            "It provides a bonus to nearby activities, and protects boats from being lost at sea. "+
            ""
        )
    },
    gull: {
        data: require("../../content/assets/herring-gull.gif"),
        spriteSheet: createImageRef(require("../../content/assets/herring-gull.png")),
        name: "Herring Gull",
        probability: 0.1,
        becomes: ["fish", "oysters", "mussels"],
        dialog: "Caaaawwww.",
        description: (
            "Gulls indicate that there is a hidden feature on a tile. These can be converted to activity tiles by being near a laboratory, or being visited by a boat."
        )
    },
    boat: {
        data: require("../../content/assets/boat.gif"),
        spriteSheet: createImageRef(require("../../content/assets/boat.png")),
        name: "Boat",
        value: -10,
        probability: 0.03,
        limit: 1,
        becomes: ["diver", "oil"],
        dialog: "Fine day to go yachting.",
        description: (
            "Gotta have a boat to work on the water."
        )
    },
    empty: {
        data: require("../../content/assets/empty.gif"),
        spriteSheet: createImageRef(require("../../content/assets/empty.png")),
        name: "Ocean",
        cost: 5,
        becomes: ["buoys", "mud"],
        dialog: "Maybe there are some bugs around?",
        description: (
            "Ocean tiles aren't empty. "+
            "They are worth points, but only next to other ocean tiles. "
        )
    },
    land: {
        data: require("../../content/assets/land.gif"),
        spriteSheet: createImageRef(require("../../content/assets/land.png")),
        name: "Land",
        probability: 0.0,
        cost: 0,
        dialog: "Can't get there from here.",
        description: "Don't go there."
    },
    buoys: {
        data: require("../../content/assets/lobster-buoys.gif"),
        spriteSheet: createImageRef(require("../../content/assets/lobster-buoys.png")),
        name: "Lobster Buoys",
        probability: 0.03,
        cost: 10,
        becomes: ["empty"],
        dialog: "Yum!",
        description: (
            "Boats can put out and recover lobster traps! "+
            "Don't molest yuor neighbors traps, or you'll get in trouble."+ 
            "Karmicly and physically."
        )
    },
    wharf: {
        data: require("../../content/assets/wharf.gif"),
        spriteSheet: createImageRef(require("../../content/assets/wharf.png")),
        name: "Wharf",
        value: 0,
        probability: 0.02,
        dialog: "'ey you hear about that fire last night?",
        limit: 1,
        description: (
            "Every good day starts at the dock! You'll have to fuel up here before you can go out and save the world. "+
            "Gah, but look at all that trash in water, sure wish someone would take care of this place"
        )
    },
    diver: {
        data: require("../../content/assets/diver-down.gif"),
        spriteSheet: createImageRef(require("../../content/assets/diver-down.png")),
        value: -10,
        name: "Diver",
        probability: 0.0,
        cost: 0,
        becomes: ["boat"],
        dialog: "brr, that's cold.",
        description: (
            "Your boats can turn into a diver to investigate underwater secrets or do harvest activities. " +
            "It's not polite to run over divers, that's why they fly such brightly colored flags."
        )
    },
    turbine: {
        data: require("../../content/assets/turbine.gif"),
        spriteSheet: createImageRef(require("../../content/assets/turbine.png")),
        value: 50,
        probability: 0.1,
        name: "Wind Turbine",
        cost: 0,
        becomes: ["turbineFire"],
        dialog: "Whoosh",
        description: "Wind turbines make electricity"
    },
    turbineFire: {
        data: require("../../content/assets/turbine-fire.gif"),
        spriteSheet: createImageRef(require("../../content/assets/turbine-fire.png")),
        name: "Damaged Wind Turbine",
        value: 0,
        probability: 0.0,
        cost: 50,
        becomes: ["turbine"],
        dialog: "Clang, clank, clang, clank.",
        description: (
            "Things break down on the water. If you're going to do business out there you better "+
            "be ready to respond quickly. "
        )
    },
    mud: {
        data: require("../../content/assets/mud.gif"),
        spriteSheet: createImageRef(require("../../content/assets/mud.png")),
        name: "Mud Flat",
        value: 10,
        probability: 0.0,
        cost: 0.0,
        becomes: ["empty"],
        dialog: "Lost my boot.",
        description: "Ooey gooey, sticky, smelly mud. Full of tasty treats. Doesn't Jimmy's uncle have a fan boat or something?"
    },
    oil: {
        data: require("../../content/assets/oil-spill.gif"),
        spriteSheet: createImageRef(require("../../content/assets/oil-spill.png")),
        name: "Oil Spill",
        value: -100.0,
        probability: 0.0,
        cost: 0.0,
        becomes: ["empty"],
        dialog: "What's a blowout preventer?",
        description: "Looks like somebody messed up big time. "
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

const StyledBoard = styled.canvas`
    display: inline-block;
    image-rendering: pixelated;
    left: 0;
    top: 0;
    width: 600px;
    height: 450px;
    margin: 0 0 0 0;
    border: 1px solid orange;
`;


const StyledContainer = styled.div`
    align-content: center;
    display: block;
    width: 100%;
    padding: 0;
`;

const TileTitle = styled.h3`
    color: orange;
`;

const StyledText = styled.div`
    font-size: larger;
    display: inline-block;
`;
  
const GameTile = styled.img`
    position: relative;
    display: inline-block;
    image-rendering: crisp-edges;
    width: 96px;
    height: 96px;
`;

const transformName = (name) => name.toLowerCase().split(" ").join("-");
const refFromName = (name) => <a href={`#${transformName(name)}`}>{name}</a>
const refListItem = (name, end) => <>{refFromName(name)}{end ? "" : ", "}</>

const build = (miniMap, gridSize) => {
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

export const AllTiles = () => {
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

export default ({ 
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
 }) => {

    const offset = (worldSize - gridSize) / 2;

    const canvasRef = useRef(null);
    const canvasRef2 = useRef(null);

    const [runtime, setRuntime] = useState(null);
    const [tiles, setTiles] = useState(null);
    const [date, setDate] = useState(new Date(2025, 3, 1));
    const [actions, setActions] = useState(6);
    const [map, setMap] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

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
        setTiles(build(_map, gridSize));  // visible tiles data structure
        setMap(_map);  // mini-map data structure 
    }, [runtime]);

    useEffect(() => {
        /*
        Draw the visible world to the canvas using the tile set object to get
        pixel data and apply it.
        */

        if (!canvasRef2 || !tiles) return;

        let start = performance.now();

        canvasRef2.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = canvasRef2.current.getBoundingClientRect();
            // do something
        });

        const dpi = window.devicePixelRatio;
        [canvasRef2.current.width, canvasRef2.current.height] = ["width", "height"].map(
            dim => getComputedStyle(canvasRef2.current).getPropertyValue(dim).slice(0, -2)
        ).map(x => x * dpi);

        const SPRITE_SIZE = 32;
        const spriteScale = canvasRef2.current.width / SPRITE_SIZE / gridSize;
        const ctx = canvasRef2.current.getContext("2d");
        ctx.imageSmoothingEnabled = false;  // disable nearest neighbor interpolation
        let requestId = null;
        const frameOffset = Array.from({length: gridSize*gridSize}, () => Math.floor(Math.random() * 4));

        (function render() {

            ctx.clearRect(0, 0, canvasRef2.current.width, canvasRef2.current.height);
            const time = performance.now() - start;
            const phase = (time / 50000.0) % 1.0;
            let count = 0;
            const dryThreshold = -0.75*SPRITE_SIZE;

            tiles.forEach((diagonal, ii) => {

                const yy = SPRITE_SIZE/4*ii;
                
                diagonal.forEach((tile, jj) => {
            
                    const xx = (SPRITE_SIZE*jj + (gridSize - (diagonal.length-1)/2)*SPRITE_SIZE) - SPRITE_SIZE*(gridSize+1)/2;
                    let zz = -(Math.sin((phase + xx/canvasRef2.current.width)*2*Math.PI) + 1.0) * SPRITE_SIZE / 2;
                    let feature = map.get_tile(tile).feature;
                    let depth = map.get_mask(tile);
                    console.log(depth);
                    if (zz < dryThreshold && feature === "empty") {
                        feature = "mud";
                        zz = dryThreshold;
                    }

                    const sprite = TileSet[feature].spriteSheet;
                    const frames = sprite.width/sprite.height;
                    const keyframe = (frameOffset[count++] + Math.floor((time/100.0)%frames))%frames;
                    
                    ctx.drawImage(
                        sprite, 
                        SPRITE_SIZE*keyframe, 0, SPRITE_SIZE, SPRITE_SIZE, 
                        spriteScale*xx, spriteScale*(yy - zz), spriteScale*SPRITE_SIZE, spriteScale*SPRITE_SIZE
                    );
                });
            });

            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);


    }, [tiles])

    
    return (
        <StyledContainer>
                        
            <StyledBoard
                ref={canvasRef2}
                width={32*gridSize}
                height={32*gridSize}
                onClick={() => {
                    if (actions) {
                        setActions(actions - 1);
                    } else {
                        console.log("bettah wait 'til tomorrow");
                        setDate(new Date(date.setDate(date.getDate()+1)));
                        setActions(actionsPerDay);
                    }
                }}
            />

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
                    setTiles(build(map, gridSize));
                }}
            />

            <StyledText>
                <p>{date.toLocaleDateString()}</p>
                <p>Actions: {actions}</p>
                <p>Score: {map ? map.score() : 0.0 }</p>
            </StyledText>
        </StyledContainer>
        
    );
};
