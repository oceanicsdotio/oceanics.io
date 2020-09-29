import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { loadRuntime } from "../components/Canvas";

export const TileSet = {
    oysters: {
        data: require("../../content/assets/oyster.gif"),
        spriteSheet: require("../../content/assets/oyster.png"),
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
        spriteSheet: require("../../content/assets/mussels.png"),
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
        spriteSheet: require("../../content/assets/platform.png"),
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
        spriteSheet: require("../../content/assets/fish-pen.png"),
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
        spriteSheet: require("../../content/assets/lighthouse.png"),
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
        spriteSheet: require("../../content/assets/herring-gull.png"),
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
        spriteSheet: require("../../content/assets/boat.png"),
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
        spriteSheet: require("../../content/assets/empty.png"),
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
        spriteSheet: require("../../content/assets/land.png"),
        name: "Land",
        probability: 0.0,
        cost: 0,
        dialog: "Can't get there from here.",
        description: "Don't go there."
    },
    buoys: {
        data: require("../../content/assets/lobster-buoys.gif"),
        spriteSheet: require("../../content/assets/lobster-buoys.png"),
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
        spriteSheet: require("../../content/assets/wharf.png"),
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
        spriteSheet: require("../../content/assets/diver-down.png"),
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
        spriteSheet: require("../../content/assets/turbine.png"),
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
        spriteSheet: require("../../content/assets/turbine-fire.png"),
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
        spriteSheet: require("../../content/assets/mud.png"),
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
        spriteSheet: require("../../content/assets/oil-spill.png"),
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
    height: 600px;
    margin: 0 0 0 0;
    border: 1px solid orange;
`;


const StyledContainer = styled.div`
    align-content: center;
    display: block;
    width: 100%;
    padding: 0;
`;


const StyledText = styled.div`
    font-size: larger;
    display: block;
`;
 
const pathFromBox = (v) => {
    return [
        [...v.slice(0, 2)],
        [v[0] + v[2], v[1]],
        [v[0] + v[2], v[1] + v[3]],
        [v[0], v[1] + v[3]]
    ]
};

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



export default ({ 
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
    startDate = [2025, 3, 1]
 }) => {

    const nav = useRef(null);
    const board = useRef(null);

    const [runtime, setRuntime] = useState(null);
    const [tiles, setTiles] = useState(null);
    const [date, setDate] = useState(new Date(...startDate));
    const [actions, setActions] = useState(actionsPerDay);
    const [map, setMap] = useState(null);

    const mapClickHandler = ({ clientX, clientY }) => {
        /*
        Update visible tiles
        */
        const {left, top} = nav.current.getBoundingClientRect();
        map.update_view(nav.current.getContext("2d"), ...[clientX - left, clientY - top].map(x => x*worldSize/128));
        setTiles(build(map, gridSize));
    };

    const boardClickHandler = ({ clientX, clientY }) => {
        /*
        Perform an action if possible.
        */
        if (actions) {
            setActions(actions - 1);
            // const {left, top} = board.current.getBoundingClientRect();
            // const rescale = board.current.width/gridSize;
            // let origin = [clientX - left, clientY - top].map(dim => Math.floor(dim*window.devicePixelRatio/rescale));
            // console.log(origin);
            map.replace_tile(0, 0);
        } else {
            console.log("bettah wait 'til tomorrow");
            setDate(new Date(date.setDate(date.getDate()+1)));
            setActions(actionsPerDay);
        }
    };

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
        if (!runtime || !nav) return;
        const offset = (worldSize - gridSize) / 2;
        const _map = new runtime.MiniMap(
            offset, 
            offset/2, 
            worldSize, 
            waterLevel, 
            nav.current.getContext("2d"), 
            gridSize
        );
      
        Object.entries(TileSet).forEach(
            ([key, {value=0.0, probability=0.0, limit=worldSize*worldSize, spriteSheet}]) => {            
                _map.insert_feature({
                    key,
                    value, 
                    probability,
                    limit,
                    dataUrl: spriteSheet
                });
                // Get raw image data
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

        if (!board || !tiles) return;

        const start = performance.now();
        let view = [
            pathFromBox([null, null, null, null]), 
            pathFromBox([null, null, null, null])
        ];

        board.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = board.current.getBoundingClientRect();
            const rescale = board.current.width/gridSize;
            let origin = [clientX - left, clientY - top].map(dim => Math.floor(dim*window.devicePixelRatio/rescale));
            view = [rescale, rescale/Math.sqrt(2)].map(size => pathFromBox([...origin, 1, 1].map(x => x*size)));
        });

        [board.current.width, board.current.height] = ["width", "height"].map(
            dim => getComputedStyle(board.current).getPropertyValue(dim).slice(0, -2)
        ).map(x => x * window.devicePixelRatio);
        
        const ctx = board.current.getContext("2d");
        ctx.imageSmoothingEnabled = false;  // disable nearest neighbor interpolation
        let requestId = null;
        
        const rotatePath = (pts, angle) => {
            let [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
            return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
        }

        const drawConnections = (a, b) => {
            ctx.beginPath();
            for (let ii=0; ii<4; ii++) {
                ctx.moveTo(...a[ii]);
                ctx.lineTo(...b[ii]);
            }
            ctx.stroke();
        }

        const drawView = (pts) => {

            ctx.beginPath();
            ctx.moveTo(...pts[0]);
            ctx.lineTo(...pts[1]);
            ctx.lineTo(...pts[2]);
            ctx.lineTo(...pts[3]);
            ctx.closePath();
            ctx.stroke();
        }

        (function render() {

            ctx.clearRect(0, 0, board.current.width, board.current.height);
            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.draw_tile(ctx, ii, jj, diagonal.length, performance.now() - start, board.current.width, tile);
                });
            });
           
            const rescale = board.current.width/gridSize;
            const rescale2 = rescale/Math.sqrt(2);
            ctx.strokeStyle="#FFAA00FF";
            ctx.lineWidth = 2.0;

            const temp = rotatePath(view[1], Math.PI/4).map(([x,y])=>[
                1.0*(x + rescale2/2.0) + (Math.floor(0.5*gridSize) + 0.75)*rescale2, 
                0.5*(y + 0.0) 
            ]);

            drawView(view[0]);
            drawView(temp);
            drawConnections(view[0], temp);

            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [tiles])

    
    return (
        <StyledContainer>
            <StyledText>
                {`${date.toLocaleDateString()} ${18-2*(actions ? actions : 0)}:00, Balance: $${map ? map.score() : 0.0}`}
            </StyledText>

            <StyledBoard
                ref={board}
                onClick={boardClickHandler}
            />

            <StyledCanvas
                ref={nav}
                width={worldSize}
                height={worldSize}
                onClick={mapClickHandler}
            />    
        </StyledContainer>
    );
};
