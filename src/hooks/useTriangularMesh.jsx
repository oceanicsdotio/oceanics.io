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


/**
Draw a square tessellated by triangles using the 2D context
of an HTML canvas. This is accomplished primarily in WASM,
called from the React Hook loop. 
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
    tickSize=10.0
}) => {
    const ref = useRef(null);

    const runtime = useWasmRuntime();

    // S3 file system meta data
    const fs = useObjectStorage({target: name ? `${TARGET}?prefix=${PREFIX}/${name}/nodes/` : null});

    const [mesh, setMesh] = useState(null);
    const style = [backgroundColor, meshColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding];

    /**
     * Create the mesh
     */
    useEffect(() => {
        // Create mesh
        if (runtime) setMesh(new runtime.InteractiveMesh(...shape)); 
    }, [runtime]);

    /**
     * If the `ref` has been assigned to a canvas target,
     * begin the render loop using the 2D context
     */
    useEffect(() => {
      
        if (!runtime || !mesh || !ref.current) return;

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            mesh.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            mesh.draw(ref.current, ...style, time);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);

    /**
     * The queue is an array of remote data assets to fetch and process.
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

    return {mesh, runtime, ref};
};