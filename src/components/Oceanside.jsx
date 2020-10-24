import React, { useEffect, useState, useRef, useReducer, useCallback } from "react";
import styled from "styled-components";
import { loadRuntime } from "../components/Canvas";
import { rotatePath, pathFromBox } from "../bathysphere";

import tileSetJSON from "../../static/oceanside.json";

/*
Tile asset references are used to pre-load all of the
sprite data for animations. Needs to happen outside of
a function so that it is evavulated during build and
the image data are bundled into the application.
*/
const TileSetAssets = {
    oysters: {
        data: require("../../content/assets/oyster.gif"),
        sprite: require("../../content/assets/oyster.png")
    },
    mussels: {
        data: require("../../content/assets/mussels.gif"),
        sprite: require("../../content/assets/mussels.png")
    },
    platform: {
        data: require("../../content/assets/platform.gif"),
        sprite: require("../../content/assets/platform.png")
    },
    fish: {
        data: require("../../content/assets/fish-pen.gif"),
        sprite: require("../../content/assets/fish-pen.png")
    },
    lighthouse: {
        data: require("../../content/assets/lighthouse.gif"),
        sprite: require("../../content/assets/lighthouse.png")
    },
    gull: {
        data: require("../../content/assets/herring-gull.gif"),
        sprite: require("../../content/assets/herring-gull.png")
    },
    boat: {
        data: require("../../content/assets/boat.gif"),
        sprite: require("../../content/assets/boat.png")
    },
    empty: {
        data: require("../../content/assets/empty.gif"),
        sprite: require("../../content/assets/empty.png")
    },
    land: {
        data: require("../../content/assets/land.gif"),
        sprite: require("../../content/assets/land.png")
    },
    buoys: {
        data: require("../../content/assets/lobster-buoys.gif"),
        sprite: require("../../content/assets/lobster-buoys.png")
    },
    wharf: {
        data: require("../../content/assets/wharf.gif"),
        sprite: require("../../content/assets/wharf.png")
    },
    diver: {
        data: require("../../content/assets/diver-down.gif"),
        sprite: require("../../content/assets/diver-down.png")
    },
    turbine: {
        data: require("../../content/assets/turbine.gif"),
        sprite: require("../../content/assets/turbine.png")
    },
    turbineFire: {
        data: require("../../content/assets/turbine-fire.gif"),
        sprite: require("../../content/assets/turbine-fire.png")
    },
    mud: {
        data: require("../../content/assets/mud.gif"),
        sprite: require("../../content/assets/mud.png")
    },
    oil: {
        data: require("../../content/assets/oil-spill.gif"),
        sprite: require("../../content/assets/oil-spill.png")
    }
};

/*
Export a "compiled" tile set with image data and game rules to
use in the manual and documentation. This allows the tiles to be used
as content in other applications, such as map glyphs. 
*/
export const TileSet = Object.fromEntries(Object.entries(tileSetJSON).map(([key, {data, sprite, ...value}]) => 
    [key, {data: TileSetAssets[key].data, sprite: TileSetAssets[key].sprite, ...value}]
));

/*
Canvas uses crisp-edges to preserve pixelated style of map.
*/
const StyledCanvas = styled.canvas`
    display: inline-block;
    image-rendering: crisp-edges;
    position: fixed;
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
    position: absolute;
    left: 0;
    top: 0;
    width: 600px;
    height: 600px;
    margin: 0;
    border: 1px solid orange;
`;

const StyledContainer = styled.div`
    align-content: center;
    display: block;
    width: 100%;
    height: 600px;
    padding: 0;
`;

const StyledText = styled.div`
    font-size: larger;
    display: block;
    position: absolute;
    margin: 5px;
`;

const drawConnections = (ctx, a, b) => {
    ctx.beginPath();
    for (let ii=0; ii<4; ii++) {
        ctx.moveTo(...a[ii]);
        ctx.lineTo(...b[ii]);
    }
    ctx.stroke();
};

const drawView = (ctx, pts) => {

    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.lineTo(...pts[3]);
    ctx.closePath();
    ctx.stroke();
};

const drawCursor = ({width}, gridSize, ctx, view) => {
    const rescale = width/gridSize;
    const rescale2 = rescale/Math.sqrt(2);
    ctx.strokeStyle="#FFAA00FF";
    ctx.lineWidth = 2.0;

   
    const xform = ([x,y])=>[
        x + rescale2/2.0 + (Math.floor(0.5*gridSize) + 0.75)*rescale2, 
        0.5*y 
    ];

    const inverse = ([x,y])=>[
        (x - rescale2/2.0 - (Math.floor(0.5*gridSize) + 0.75)*rescale2), 
        2*y 
    ];

    const temp = rotatePath(view[1], Math.PI/4).map(xform);
    const temp2 = rotatePath(temp.map(inverse), -Math.PI/4);

    drawView(ctx, view[0]);
    drawView(ctx, temp);
    drawConnections(ctx, view[0], temp);

    // ctx.lineWidth = 1.0;
    // ctx.strokeStyle="#FFFFFFFF";
    // drawView(ctx, temp2);
};
 
export default ({ 
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
    startDate = [2025, 3, 1],
    endTurnMessage = "Bettah wait 'til tomorrow."
 }) => {
    /*
    The `Oceanside` component contains all of the functionality to
    embed the game in any web page using React.
    
    It consists of two canvases and a text block inside a container 
    <div>. One canvas displays the navigation minimap, and the other
    is where the animated game tiles are rendered. The text block
    displays the current datetime and score. 

    The properties change game play in the following ways.

    The number of tiles visible is the square of `gridSize`, 
    so scores are higher for larger values.

    The total number of tiles, and therefore the probability of 
    finding certain features, is the square of `worldSize`. 

    Each tile has an elevation value. Tiles above `waterLevel` 
    are always land, and therfore worth nothing. 
    Other wet tiles become mud depending on the tidal cycle and their
    elevation.

    The `actionsPerDay` property determines how quickly time passes,
    and how many things you can interact with per day. This ultimately
    puts a limit on the score you can earn.

    The `startDate` and `endTurnMessage` props currently have no 
    effect on game play. 
    */
    const [keys, setKeys] = useReducer(
        (state, {type, key}) => {
            switch (type) {
                case "keydown":
                    return { ...state, [key]: true };
                case "keyup":
                    return { ...state, [key]: false };
                default:
                    return state;
            }
        }, 
        ["Shift", "C"]
            .map(key => key.toLowerCase())
            .reduce((currentKeys, key) => {
                currentKeys[key] = false;
                return currentKeys;
            }, {})
    );

    ["keyup", "keydown"].map(type => {
        useEffect(() => {
            const listen = ({key, repeat}) => {
                const symbol = key.toLowerCase();
                if (repeat || !keys.hasOwnProperty(symbol)) return;
                if (keys[symbol] === ("keyup" === type))
                    setKeys({ type, key: symbol });  
            };
            window.addEventListener(type, listen, true);
            return () => window.removeEventListener(type, listen, true);
        }, [keys]);
    });
  
    const [clamp, setClamp] = useState(false);
    useEffect(() => {
        if (Object.values(keys).every(x => x)) setClamp(!clamp);
    }, [keys]);

    const tomorrow = (date) => new Date(date.setDate(date.getDate()+1));
    const [map, setMap] = useState(null);  // map data from rust
    const nav = useRef(null);  // minimap for navigation

    const [runtime, setRuntime] = useState(null);
    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    const [clock, takeAnActionOrWait] = useReducer(
        ({date, actions}, {clientX, clientY})=>{
            /*
            Take an action (swap a tile) or advance to the next day. 
            */
            
            if (actions) {
                const pts = [[clientX, clientY]];
                console.log("Click @", pts);
                
                // console.log("Transform @", temp);
                map.replace_tile(0, 0);
            }
            else console.log(endTurnMessage);
            
            return actions ? {
                date,
                actions: actions - 1
            } : {
                date: tomorrow(date),
                actions: actionsPerDay
            }
        }, {
            actions: actionsPerDay, 
            date: new Date(...startDate)
        }
    );


    const [tiles, populateVisibleTiles] = useReducer(
        (tiles, map, event, nav) => {
            /*
            Update currently visible tiles from map view.

            The `useReducer` hook takes the old value as an input,
            so we can diff the sets of tiles, and only generate or
            retrieve the ones that are coming into view.
            */
            console.log(event);
            console.log(nav);

            if (event && nav) {
                const { clientX, clientY } = event;
                const {left, top} = nav.getBoundingClientRect();
                map.update_view(nav.getContext("2d"), ...[clientX - left, clientY - top].map(x => x*worldSize/128));
            }

            const diagonals = gridSize * 2 - 1;
            const build = [];
            let count = 0;
            map.clear();

            for (let row = 0; row < diagonals; row++) {
                build.push([]);
                const columns = (row + (row < gridSize ? 1 : diagonals - 2 * row));
                for (let column = 0; column < columns; column++) {
                    let col = columns - 1 - column; // reverse the order in the index
                    build[row].push(map.insert_tile(count++, row, col));
                }
                build[row] = build[row].reverse();
            }
            return build
        
        },  null
    );

    
    useEffect(() => {
        /*
        When the runtime loads for the first time, create a pixel map instance and draw the generated world to the canvas, then save the map reference to react state.

        Build the tileset from the random Feature table, or leave space for land.
       
        Create the probability table by accumulative discreet probabilities, and save the object that will be query for tile selections to react state.

        The same data structure will hold the selected tiles. 
        */
        if (!runtime || !nav.current) return;
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
            ([key, {value=0.0, probability=0.0, limit=worldSize*worldSize, sprite}]) => {            
                _map.insert_feature({
                    key,
                    value, 
                    probability,
                    limit,
                    dataUrl: sprite
                });
                // Get raw image data
            }
        );
        populateVisibleTiles(_map, null, nav);  // visible tiles data structure
        setMap(_map);  // mini-map data structure 
    }, [runtime]);


    const board = useRef(null);  // animated GIF tiles
    
    useEffect(() => {
        /*
        Draw the visible area to the board canvas using the 
        tile set object. 
        */

        if (!board.current || !tiles) return;

        const canvas = board.current;
        const start = performance.now();
        let view = [
            pathFromBox([null, null, null, null]), 
            pathFromBox([null, null, null, null])
        ];

        canvas.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = canvas.getBoundingClientRect();
            const rescale = canvas.width/gridSize;
           
            let origin = [clientX - left, clientY - top]
                .map(dim => dim*window.devicePixelRatio/rescale)
                .map(x => clamp ? Math.floor(x) : x);

            view = [rescale, rescale/Math.sqrt(2)].map(
                size => pathFromBox([...origin, 1, 1].map(x => x*size))
            );
        });

        [canvas.width, canvas.height] = ["width", "height"]
            .map(dim => getComputedStyle(canvas).getPropertyValue(dim))
            .map(arr => arr.slice(0, -2))
            .map(x => x * window.devicePixelRatio);
        
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;  // disable nearest neighbor interpolation
        let requestId = null;
        
        (function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.draw_tile(ctx, ii, jj, diagonal.length, performance.now() - start, canvas.width, tile);
                });
            });

            drawCursor(canvas, gridSize, ctx, view);
           
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [tiles, clamp])

    
    return (
        <StyledContainer>
            <StyledText>
                {`${clock.date.toLocaleDateString()} ${18-2*(clock.actions ? clock.actions : 0)}:00, Balance: $${map ? map.score() : 0.0}`}
            </StyledText>

            <StyledBoard
                ref={board}
                onClick={(event) => {
                    event.persist();
                    takeAnActionOrWait(event);
                }}
            />
            
            <StyledCanvas
                ref={nav}
                width={worldSize}
                height={worldSize}
                onClick={(event) => {
                    populateVisibleTiles(map, event, nav);
                    console.log(event);
                }}
            />    
        </StyledContainer>
    );
};
