import { useEffect, useState, useReducer, useRef } from "react";
import { useStaticQuery, graphql } from "gatsby";

/**
 * Dedicated worker loaders.
 */
import Worker from "./useBathysphereApi.worker.js";

/**
 * GraphQL fragment for static query to get sprite sheets and tile metadata.
 */
const query = graphql`
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
`


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
 * @param {String} args.backgroundColor - color of animation loop blending
 */
export default ({
    map,
    gridSize, 
    worldSize,
    backgroundColor = "#000000FF",
}) => {

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
    } = useStaticQuery(query);

    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    }, []);
    

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
     * Web worker for background tasks
     */
    const worker = useRef(null);

    /**
     * Create the web worker
     */
    useEffect(() => {
        worker.current = new Worker();
        return () => {worker.current.terminate()};
    }, [ ]);

    useEffect(() => {
        if (!worker.current || !map) return;

        (async () => {
            const iconSet = await worker.current.parseIconSet({nodes, templates, worldSize});
            iconSet.forEach(x => {map.insertFeature(x)});
            populateVisibleTiles(map, null);  
        })();
    }, [ worker, map ]);

    /**
     * Draw the visible area to the board canvas using the 
     * tile set object. 
     */
    useEffect(() => {
        if (
            !board || 
            !board.current || 
            !tiles || 
            !worker.current
        ) return;

        [board.current.width, board.current.height] = ["width", "height"].map(
            dim => getComputedStyle(board.current).getPropertyValue(dim).slice(0, -2)
        ).map(x => x * window.devicePixelRatio);

        const ctx = board.current.getContext(`2d`);

        let requestId = null;
      
        ctx.imageSmoothingEnabled = false;  // disable interpolation
    
        (function render() {

           
    
            const { width, height } = board.current;

            runtime.clear_rect_blending(ctx, width, height, backgroundColor);

            tiles.forEach((diagonal, ii) => {
                diagonal.forEach((tile, jj) => {
                    map.drawTile(ctx, ii, jj, diagonal.length, performance.now(), width, tile);
                });
            });

            requestId = requestAnimationFrame(render);
        })();

        return () => { cancelAnimationFrame(requestId) };
    }, [ tiles, worker ]);

    
    return {
        ref: board,
        onClick: (event) => {
            event.persist(); // otherwise React eats it
            try {
                // takeAnActionOrWait(event);
            } catch (err) {
                console.log(err);
            }
        }
    } 
};