import { useEffect, useState, useReducer, useRef } from "react";
import { useStaticQuery, graphql } from "gatsby";
import { 
    eventCoordinates,
    targetHtmlCanvas, 
    drawCursor, 
    inverse 
} from "../bathysphere";
import useWasmRuntime from "../hooks/useWasmRuntime";
import useKeystrokeReducer from "../hooks/useKeystrokeReducer";
import {ghost} from "../palette";



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

    const nav = useRef(null);
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

    const [cursor, setCursor] = useState(null);

    useEffect(()=>{
        if (!runtime) return;
        const _cursor = new runtime.PrismCursor(0.0, 0.0, window.devicePixelRatio);
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

                cursor.update(inverted[0], inverted[1]);
                const cell = cursor.eventGridCell(width, gridSize).map(x=>Math.floor(x));
               
                if (cell.every(dim => dim < gridSize && dim >= 0)) {
                    map.replaceTile(...cell);
                    return {
                        date,
                        actions: actions - 1
                    };
                }    
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

        const lookup = Object.fromEntries(
            nodes.map(({relativePath, publicURL})=>
                [relativePath, publicURL])
        );
    
        templates.map(({
            name,
            spriteSheet, 
            probability=null,
            value=null,
            limit=null
        })=>({
            key: name.toLowerCase().split(" ").join("-"),  
            dataUrl: lookup[spriteSheet],
            limit: limit ? limit : worldSize*worldSize,
            probability: probability ? probability : 0.0,
            value: value ? value : 0.0
        })).forEach(x => {
            _map.insertFeature(x);
        });

        populateVisibleTiles(_map, null);  
        setMap(_map); 

    }, [runtime]);

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
            !cursor
        ) return;

        let {
            start, 
            ctx, 
            shape: [width, height], 
            requestId, 
            frames,
            cursor
        } = targetHtmlCanvas(board, `2d`);

        ctx.imageSmoothingEnabled = false;  // disable interpolation

        // board.current.addEventListener('mousemove', (event) => {
        //     cursor = cursor.eventGridCell(eventCoordinates(event, board.current), width, gridSize);
        // });

        (function render() {

            const time = performance.now() - start;

            runtime.clear_rect_blending(ctx, width, height, backgroundColor);
            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.drawTile(ctx, ii, jj, diagonal.length, time, width, tile);
                });
            });

            // if (cursor) drawCursor(width, gridSize, ctx, cursor, clamp);

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

        return () => cancelAnimationFrame(requestId);
    }, [tiles, clamp]);
    
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