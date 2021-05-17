import { useEffect, useState, useReducer, useRef } from "react";
import { useStaticQuery, graphql } from "gatsby";
import { lichen, orange } from "../palette";

/**
 * Dedicated worker loaders
 */
import Worker from "./useBathysphereApi.worker.js";

/*
 * Rotate a path of any number of points about the origin.
 * You need to translate first to the desired origin, and then translate back 
 * once the rotation is complete.
 * 
 * Not as flexible as quaternion rotation.
 */
const rotatePath = (pts, angle) => {
   
    let [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
    return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
}


const eventCoordinates = ({clientX, clientY}, canvas) => {
    // Short hand for element reference frame
    const {left, top} = canvas.getBoundingClientRect();
    return [clientX - left, clientY - top]
};


/*
 * Translate x and scale y, rotate CCW, scale points.
 * Points must be in the canvas coordinate reference frame. 
 * The width is the width of the canvas drawing area, and 
 * gridSize is the number of squares per side of the world.
 */
const inverse = (points, width, gridSize) => {
   
    return rotatePath(points.map(([x,y])=> [
            x - (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
            2*y 
        ]
), -Math.PI/4).map(pt => pt.map(dim => dim*Math.sqrt(2)))};



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
    gridSize,
    backgroundColor = "#00000000",
}) => {

    /**
     * Canvas reference.
     */
    const overlay = useRef(null);

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
     * Complex cursor handled in Rust
     */
    const [cursor, setCursor] = useState(null);

    /**
     * When runtime loads, create a cursor instance.
     */
    useEffect(()=>{
        if (!runtime) return;
        const _cursor = new runtime.PrismCursor(0.0, 0.0, window.devicePixelRatio, gridSize);
        setCursor(_cursor);
    }, [ runtime ]);
    
    /**
     * Clamp custom cursor to the discrete grid.
     */
    const [ clamp, setClamp ] = useState(false);
    
    /**
     * Toggle the key state when it is pressed and released.
     * There is technically no need for the default case.
     * 
     * The initial value of the state is taken from the second
     * arg to `useReducer`.
     *
     *Add and remove keypress listeners as necessary. These
     * will call the `setKeys` method generated by `useReducer`
     * to logicaly update the array of pressed keys. 
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

    
    useEffect(() => {
        const listeners = ["keyup", "keydown"].map(type => {
            const listen = ({key, repeat}) => {
                const symbol = key.toLowerCase();
                if (repeat || !keys.hasOwnProperty(symbol)) return;
                if (keys[symbol] === ("keyup" === type)) setKeys({ type, key: symbol });  
            };
            window.addEventListener(type, listen, true);
            return [type, listen];
        });
        return () => listeners.map(each => window.removeEventListener(...each, true));
    }, [ keys ]);
  

    useEffect(() => {
        if (Object.values(keys).every(x => x)) setClamp(!clamp);
    }, [ keys ]);

   
    //
    useEffect(() => {
        if (
            !overlay || 
            !overlay.current ||
            !cursor
        ) return;

        overlay.current.addEventListener('mousemove', (event) => {
            const xy = eventCoordinates(event, overlay.current);
            cursor.update(...xy);
        });

    }, [ cursor, overlay ]);


    /**
     * Draw the visible area to the board canvas using the 
     * tile set object. 
     */
    useEffect(() => {
        if (
            !overlay || 
            !overlay.current || 
            !cursor
        ) return;

        [overlay.current.width, overlay.current.height] = ["width", "height"].map(
            dim => getComputedStyle(overlay.current).getPropertyValue(dim).slice(0, -2)
        ).map(x => x * window.devicePixelRatio);

        const ctx = overlay.current.getContext(`2d`);
        const { width, height } = overlay.current;
       
        runtime.clear_rect_blending(ctx, width, height, backgroundColor);
        
        const Δx = 1; 
        const Δy = 1;
        const curs = [cursor.x(), cursor.y()];

        const cellSize = width/gridSize;
        const [inverted] = inverse([curs.map(x=>x*cellSize)], width, gridSize).map(pt => pt.map(x=>x/cellSize));
        
        [
            {upperLeft: curs, color: orange},
            {upperLeft: inverted, color: lichen}
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
  
    }, [ clamp, cursor ]);
    
    return {
        ref: overlay
    }  
};