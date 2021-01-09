import { useState, useEffect, useRef } from "react";

import { GeoJsonSource } from "./useMapboxGeoJsonLayers";
import useWasmRuntime from "./useWasmRuntime";
import useObjectStorage from "./useObjectStorage";


const MAX_VALUE = 5200;
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";
const PREFIX = "MidcoastMaineMesh";


/**
 * Log normal density function for color mapping
 * @param {*} x 
 * @param {*} m 
 * @param {*} s 
 */
const logNormal = (x, m=0, s=1.0) => 
    (1/s/x/Math.sqrt(2*Math.PI)*Math.exp(-1*(Math.log(x)-m)**2 / (2 * s**2)));


const mouseMoveEventListener = (canvas, data) => {
    // recursive use error on line below when panic! in rust
    const eventType = 'mousemove';
    const listener = ({clientX, clientY}) => {
        try {
            const {left, top} = canvas.getBoundingClientRect();
            data.updateCursor(clientX-left, clientY-top);
        } catch (err) {
            canvas.removeEventListener(eventType, listener);
            console.log(`Unregistering '${eventType}' events due to error: ${err}.`);
        }  
    }

    console.log(`Registering '${eventType}' events.`)
    return [eventType, listener]
};

/**
 * Draw a square tessellated by triangles using the 2D context
 * of an HTML canvas. This is accomplished primarily in WASM,
 * called from the React Hook loop. 
 */
export default ({
    map=null,
    name="",
    attribution="Oceanics.io",
    fontSize=12.0,
    shape=[32,32],
    meshColor=`#EF5FA1CC`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000088`,
    lineWidth=1.0,
    labelPadding=2.0,
    tickSize=10.0,
    fade=1.0,
    count=9,
    zero=0.2,
    radius=8.0,
    drag=0.05,
    bounce=0.95,
    springConstant=0.2,
    timeConstant=0.000001,
    collisionThreshold=0.001,
}) => {

    /**
     * Ref is passed out to be assigned to a canvas element. This ensures that `ref`
     * is defined.
     */
    const ref = useRef(null);


    /**
     * The Rust-WASM backend.
     */
    const runtime = useWasmRuntime();


    /**
     * Retrieve S3 file system meta data. The `null` target prevents any HTTP request
     * from happening.
     */ 
    const fs = useObjectStorage({target: name ? `${TARGET}?prefix=${PREFIX}/${name}/nodes/` : null});


    /**
     * Create handle for the mesh structure. 
     */
    const [mesh, setMesh] = useState(null);


    /**
     * Create the mesh structure in the Rust-WASM backend. 
     * 
     * This implementation uses a right-angle triangulation equal to subdividing
     * each element of a square grid in half.
     */
    useEffect(() => {
        if (runtime && !name) setMesh(new runtime.InteractiveMesh(...shape)); 
    }, [runtime]);


    /**
     * If the `ref` has been assigned to a canvas target,
     * begin the render loop using the 2D context
     */
    useEffect(() => {

        if (!runtime || !mesh || !ref.current) return;

        ref.current.addEventListener(...mouseMoveEventListener(ref.current, mesh));

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;

            // particleSystem.updateState(drag, bounce, timeConstant, collisionThreshold);
            // particleSystem.draw(canvas, time, collisionThreshold, style);
            mesh.draw(ref.current, time, {backgroundColor, meshColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding, fade, radius: 8, nodeColor: "#FFFFFFFF"});
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);


    /**
     * The queue is an array of remote data assets to fetch and process. 
     * 
     * Updating the queue triggers `useEffect` hooks depending on whether
     * visualization elements have been passed in or assigned externally.
     */
    const [queue, setQueue] = useState([]);


    /**
     * By default set the queue to the fragments listed in the response
     * from S3 object storage queries.
     */
    useEffect(()=>{
        if (!fs) return;
        setQueue(fs.objects.filter(x => !x.key.includes("undefined")));
    }, [fs]);


    /**
     * Request all fragments sequentially. 
     * 
     * All of this should be cached by the browser
     */
    useEffect(()=>{
        if (!map || !queue.length || map.getLayer(`mesh-${queue[0].key}`)) return;
            
        fetch(`${TARGET}/${queue[0].key}`)
            .then(response => response.blob())
            .then(blob => {

                (new Promise((resolve) => {
                    var reader = new FileReader();
                    reader.onloadend = () => {resolve(reader.result)};
                    reader.readAsArrayBuffer(blob);
                })).then(array => {

                    const source = GeoJsonSource({features: (new Float32Array(array)).reduce(
                        (acc, cur)=>{
                            if (!acc.count) acc.features.push([]);
                        
                            acc.features[acc.features.length-1].push(cur);
                            acc.count = (acc.count + 1 ) % 3;
                            return acc;
                        },
                        {count: 0, features: []}
                    ).features.map(
                        coordinates => Object({
                            geometry: {type: "Point", coordinates},
                            properties: {
                                q: (((100 + coordinates[2]) / MAX_VALUE) - 1)**2,
                                ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
                            }
                        })
                    )});

                    source.attribution = attribution;

                    map.addLayer({
                        id: `mesh-${queue[0].key}`,
                        type: "circle",
                        source: source,
                        paint: {
                            "circle-radius":  {stops: [[0, 0.1], [22, 1]]},
                            "circle-stroke-width": 1,
                            "circle-stroke-color": [
                                "rgba",
                                ["*", 127, ["get", "q"]],
                                ["*", 127, ["get", "ln"]],
                                ["*", 127, ["-", 1, ["get", "q"]]],
                                0.5
                            ]
                        }
                    });

                    setQueue(queue.slice(1, queue.length));
                });
            });
    },[map, queue]);

    return {
        mesh, 
        runtime, 
        ref
    };
};