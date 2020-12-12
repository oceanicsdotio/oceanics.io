import { useEffect, useState, useReducer, useRef, useCallback } from "react";
import { useStaticQuery, graphql } from "gatsby";
import { 
    eventCoordinates, 
    eventGridCell, 
    targetHtmlCanvas, 
    drawCursor, 
    inverse 
} from "../bathysphere";
import useWasmRuntime from "../hooks/useWasmRuntime";
import useKeystrokeReducer from "../hooks/useKeystrokeReducer";
import tileSetJSON from "../data/oceanside.yml";


/**
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

/**
 * Export a "compiled" tile set with image data and game rules to
 * use in the manual and documentation. This allows the tiles to be used
 * as content in other applications, such as map glyphs. 
 */
export const TileSet = Object.fromEntries(Object.entries(tileSetJSON).map(([key, {data, sprite, ...value}]) => 
    [key, {data: TileSetAssets[key].data, sprite: TileSetAssets[key].sprite, ...value}]
));


const TileQuery = graphql`
    query {
        allOceancideYaml {
            nodes {
                name
            }
        }
        icons: allFile(filter: { 
            sourceInstanceName: { eq: "assets" },
            extension: {in: ["png", "gif"]}
        }) {
            nodes {
                relativePath
                prettySize
                extension
                birthTime
            }
        }
    }
`;

/**
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
export default ({
    gridSize = 6, 
    worldSize = 32, 
    waterLevel = 0.7,
    actionsPerDay = 6,
    endTurnMessage = "Bettah wait 'til tomorrow."
}) => {

    const nav = useRef(null);
    const board = useRef(null);
    const data = useStaticQuery(TileQuery);

    useEffect(()=>{
        console.log("tiles", data);
    },[data]);
    

    const runtime = useWasmRuntime();
    const [map, setMap] = useState(null);  // map from rust
    const [clamp, setClamp] = useState(false); // clamp cursor to grid
    
    const [clock, takeAnActionOrWait] = useReducer(
        ({date, actions}, event)=>{
            /*
            Take an action (swap a tile) or advance to the next day. 
            */
            if (typeof board === "undefined" || !board || !board.current) {
                return {date, actions}
            }
            if (actions) {
                const {width} = board.current;
                const inverted = inverse(
                    [eventCoordinates(event, board.current)], 
                    600, 
                    gridSize
                ).pop();
                const cell = eventGridCell(inverted, width, gridSize).map(x=>Math.floor(x));
               
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
      
        Object.entries(TileSet).forEach(
            ([key, {value=0.0, probability=0.0, limit=worldSize*worldSize, sprite}]) => {            
                _map.insertFeature({
                    key,
                    value, 
                    probability,
                    limit,
                    dataUrl: sprite
                });
            }
        );
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
            !tiles
        ) return;

        const canvas = board.current;
        let cursor = null;
        let {
            start, 
            ctx, 
            shape: [width, height], 
            requestId, 
            frames
        } = targetHtmlCanvas(board, `2d`);

        ctx.imageSmoothingEnabled = false;  // disable interpolation

        canvas.addEventListener('mousemove', (event) => {
            cursor = eventGridCell(eventCoordinates(event, canvas), width, gridSize);
        });

        (function render() {

            const time = performance.now() - start;
            runtime.clear_rect_blending(ctx, width, height, "#000000FF");
            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.drawTile(ctx, ii, jj, diagonal.length, time, width, tile);
                });
            });

            if (cursor) drawCursor(width, gridSize, ctx, cursor, clamp);

            const caption = `${clock.date.toLocaleDateString()} ${18-2*(clock.actions ? clock.actions : 0)}:00, Balance: $${map ? map.score() : 0.0}`;

            runtime.draw_caption(
                ctx, 
                caption, 
                0.0, 
                height, 
                "#FFFFFFFF", 
                "36px Arial"
            );

            frames = runtime.draw_fps(ctx, frames, time, "#FFFFFFFF");
            requestId = requestAnimationFrame(render);
            
        })();

        return () => cancelAnimationFrame(requestId);
    }, [tiles, clamp]);
    
    return {
        worldSize,  
        onBoardClick: 
            (event) => {
                event.persist(); // otherwise React eats it
                try {
                    takeAnActionOrWait(event);
                } catch (err) {
                    console.log(err);
                }
            }, 
        onNavClick: 
            (event) => {
                event.persist();
                populateVisibleTiles(map, event);
            },
        TileSet, 
        populateVisibleTiles,
        ref: {
            nav,
            board
        }
    }  
};