import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { loadRuntime } from "../components/Canvas";

import tileSetJSON from "../../static/oceanside.json";


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

export const TileSet = Object.fromEntries(Object.entries(tileSetJSON).map(([key, {data, sprite, ...value}]) => 
    [key, {data: TileSetAssets[key].data, sprite: TileSetAssets[key].sprite, ...value}]
));


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
