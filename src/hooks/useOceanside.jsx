import { useEffect, useState, useReducer, useRef } from "react";
import { useStaticQuery, graphql } from "gatsby";
import { 
    eventCoordinates,
    targetHtmlCanvas,
    inverse,
    rotatePath
} from "../bathysphere";
import useWasmRuntime from "../hooks/useWasmRuntime";
import useKeystrokeReducer from "../hooks/useKeystrokeReducer";
import {ghost} from "../palette";

import Worker from "./useOceanside.worker.js";




/**
 * The `Oceanside` hook provides all of the functionality to
 * embed the game/visualization engine in any React app.
 * 
 * The interface consists of two canvases. One canvas displays 
 * the navigation minimap, and the other is where the animated 
 * game tiles are rendered. 
 * 
 * A text block displays the current datetime and score. 
 * 
 * Tile asset references are used to pre-load all of the
 * sprite data for animations. 
 * 
 * @param {Object} args - Arguments object
 * @param {number} args.gridSize - Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`, so scores are higher for larger.
 * @param {number} args.worldSize - Integer height and width of global grid. The total number of tiles, and therefore the probability of finding certain features, is the square of `worldSize`. 
 * @param {number} args.waterLevel - Fraction of tidal evolution. Each tile has an elevation value. Tiles above `waterLevel` are always land, and therfore worth nothing. Other wet tiles become mud depending on the tidal cycle and their elevation.
 * @param {number} args.actionsPerDay - The `actionsPerDay` property determines how quickly time passes, and how many things you can interact with per day. This ultimately puts a limit on the score you can earn.
 * @param {String} args.endTurnMessage - message to display when no actions remain
 * @param {String} args.overlayColor - color to draw metadata and overlays.
 * @param {String} args.backgroundColor - color of animation loop blending
 * @param {String} args.font - font for metadata overlays
 */
export default ({
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
    endTurnMessage = "Bettah wait 'til tomorrow.",
    overlayColor = ghost,
    backgroundColor = "#000000FF",
    font = "36px Arial"
}) => {

    /**
     * Ref for clickable minimap that allows world navigation
     */
    const nav = useRef(null);

    /**
     * Ref for isometric view render target
     */
    const board = useRef(null);

    /**
     * Use graphql to fetch metadata and asset information for
     * the pixel tile rendering engine. 
     */
    const {
        tiles: {
            templates
        }, 
        icons: {
            nodes
        }
    } = useStaticQuery(graphql`
        query {
            tiles: allOceansideYaml {
                templates: nodes {
                    name,
                    probability,
                    value, 
                    cost,
                    spriteSheet
                }
            }
            icons: allFile(filter: { 
                sourceInstanceName: { eq: "assets" },
                extension: { eq: "png" }
            }) {
                nodes {
                    relativePath
                    publicURL
                }
            }
        }
    `);

    /**
     * Load or recycle the Rust-WebAssembly runtime.
     */
    const runtime = useWasmRuntime();

    /**
     * Complex cursor handled in Rust
     */
    const [cursor, setCursor] = useState(null);

    useEffect(()=>{
        if (!runtime) return;
        const _cursor = new runtime.PrismCursor(0.0, 0.0, window.devicePixelRatio, gridSize);
        setCursor(_cursor);
    },[runtime]);
    
    /**
     * MiniMap data structure from Rust-WebAssembly.
     */
    const [map, setMap] = useState(null);

    /**
     * Clmap custom cursor to the discrete grid.
     */
    const [clamp, setClamp] = useState(false);
    
    /*
     * Take an action (swap a tile) or advance to the next day. 
     */
    const [clock, takeAnActionOrWait] = useReducer(
        ({date, actions}, event)=>{
           
            if (typeof board === "undefined" || !board || !board.current || !cursor) {
                return {date, actions}
            }
            if (actions) {
                const {width} = board.current;
                const inverted = inverse(
                    [eventCoordinates(event, board.current)], 
                    600, 
                    gridSize
                ).pop();

                cursor.update(...inverted);
                map.replaceTile(cursor.gridX(width), cursor.gridY(width));
                return {
                    date,
                    actions: actions - 1
                };
                  
            } else {
                console.log(endTurnMessage);
                return {
                    date: new Date(date.setDate(date.getDate()+1)),
                    actions: actionsPerDay
                };
            };
        }, {
            actions: actionsPerDay, 
            date: new Date()
        }
    );

    /**
     * Update currently visible tiles from map view.
     * 
     * The `useReducer` hook takes the old value as an input,
     * so we can diff the sets of tiles, and only generate or
     * retrieve the ones that are coming into view.
     */
    const [tiles, populateVisibleTiles] = useReducer(
        (tiles, map, event) => {
            if (event && typeof nav !== "undefined" && nav && nav.current)
                map.updateView(
                    nav.getContext("2d"), 
                    eventCoordinates(event, nav.current)
                        .map(x => x*worldSize/128)
                );
            
            const diagonals = gridSize * 2 - 1;
            const build = [];
            let count = 0;
            map.clear();

            for (let row = 0; row < diagonals; row++) {
                build.push([]);
                const columns = (row + (row < gridSize ? 1 : diagonals - 2 * row));
                for (let column = 0; column < columns; column++) {
                    let col = columns - 1 - column; // reverse the order in the index
                    build[row].push(map.insertTile(count++, row, col));
                }
                build[row] = build[row].reverse();
            }
            return build
        
        },  null
    );

    /**
     * If shortcut keys are pressed, toggle clamp
     */ 
    useKeystrokeReducer(
        ["Shift", "C"], () => {setClamp(!clamp)}
    );

    /**
     * Web worker for background tasks
     */
    const worker = useRef(null);

    /**
     * Create the web worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * When the runtime loads for the first time, create a pixel map  
     * instance and draw the generated world to the canvas, 
     * then save the map reference to react state.
     * 
     * Build the tileset from the random Feature table, 
     * or leave space for land. 
     * 
     * Create the probability table by accumulative discrete 
     * probabilities, and save the object that will be query for 
     * tile selections to react state.
     * 
     * The same data structure will hold the selected tiles. 
     */
    useEffect(() => {
        if (!runtime || !nav.current || !worker.current) return;

        const offset = (worldSize - gridSize) / 2;
        const _map = new runtime.MiniMap(
            offset, 
            offset/2, 
            worldSize, 
            waterLevel, 
            nav.current.getContext("2d"), 
            gridSize
        );
            
        (async () => {
            const iconSet = await worker.current.parseIconSet({nodes, templates, worldSize});
            iconSet.forEach(x => {_map.insertFeature(x)});
            populateVisibleTiles(_map, null);  
        })();

        setMap(_map); 

    }, [ runtime, worker ]);

    /**
     * Draw the visible area to the board canvas using the 
     * tile set object. 
     */
    useEffect(() => {
        if (
            typeof board === "undefined" || 
            !board || 
            !board.current || 
            !tiles || 
            !worker.current
        ) return;

        let {
            start, 
            ctx, 
            shape: [width, height], 
            requestId, 
            frames
        } = targetHtmlCanvas(board, `2d`);

        ctx.imageSmoothingEnabled = false;  // disable interpolation

        board.current.addEventListener('mousemove', (event) => {
            if (cursor) cursor.update(...eventCoordinates(event, board.current));
        });

        (function render() {

            const time = performance.now() - start;

            runtime.clear_rect_blending(ctx, width, height, backgroundColor);
            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.drawTile(ctx, ii, jj, diagonal.length, time, width, tile);
                });
            });

            if (cursor) {

                /*
                Convenience method to create a bounding box polygon
                from a upper-left, width/height type extent. 
            
                Upperleft is given in grid coordinates, and width and height
                are integers corresponded to the number of grid cells per
                side of the selected region.
                */
               
                const Δx = 1; 
                const Δy = 1;
                const curs = [cursor.x(), cursor.y()];
                const cellSize = width/gridSize;
                const [inverted] = inverse([curs.map(x=>x*cellSize)], width, gridSize).map(pt => pt.map(x=>x/cellSize));
                
                [
                    {upperLeft: curs, color: "#FFAA00FF"},
                    {upperLeft: inverted, color: "#AAFF00FF"}
                ].map(({color, upperLeft})=>{

                    const [x, y] = upperLeft.map(dim => clamp ? Math.floor(dim) : dim);

                    const cellA = [
                        [x, y],
                        [x + Δx, y],
                        [x + Δx, y + Δy],
                        [x, y + Δy]
                    ].map(
                        pt => pt.map(dim => dim*cellSize)
                    );
                    
                    const cellB = rotatePath(
                        cellA.map(pt => pt.map(x => x/Math.sqrt(2))), 
                        Math.PI/4
                    ).map(
                        ([x,y])=>[
                            x + (Math.floor(0.5*gridSize) + 1.25)*cellSize/Math.sqrt(2), 
                            0.5*y
                        ]
                    );

                    return [cellA, cellB, color];
                }).map(([cellA, cellB, color])=>{
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2.0;

                    [cellA, cellB].forEach(cell => {
                        ctx.beginPath();
                        ctx.moveTo(...cell[0]);
                        cell.slice(1, 4).forEach(pt => ctx.lineTo(...pt));
                        ctx.closePath();
                        ctx.stroke(); 
                    });

                    ctx.beginPath();
                    for (let ii=0; ii<4; ii++) {
                        ctx.moveTo(...cellA[ii]);
                        ctx.lineTo(...cellB[ii]);
                    }
                    ctx.stroke();
                });
            }
            
            runtime.draw_caption(
                ctx, 
                `${clock.date.toLocaleDateString()} ${18-2*(clock.actions ? clock.actions : 0)}:00, Balance: $${map ? map.score() : 0.0}`, 
                0.0, 
                height, 
                overlayColor, 
                font
            );

            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
            
        })();

        return () => {
            cancelAnimationFrame(requestId);
            worker.current.terminate();

        };
    }, [ tiles, clamp, cursor, worker ]);
    
    return {
        worldSize,  // return in case you want the default
        nav: {
            ref: nav,
            onClick: (event) => {
                event.persist();
                populateVisibleTiles(map, event);
            }
        },
        board: {
            ref: board,
            onClick: (event) => {
                event.persist(); // otherwise React eats it
                try {
                    takeAnActionOrWait(event);
                } catch (err) {
                    console.log(err);
                }
            }
        },
        populateVisibleTiles,
    }  
};