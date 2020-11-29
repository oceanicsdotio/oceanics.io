import { useState, useEffect } from "react";
import useWasmRuntime from "../hooks/useWasmRuntime";


/**
Draw a square tessellated by triangles using the 2D context
of an HTML canvas. This is accomplished primarily in WASM,
called from the React Hook loop. 
*/
export default ({
    ref,
    fontSize=12.0,
    shape=[32,32],
    meshColor=`#EF5FA1CC`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000088`,
    lineWidth=1.0,
    labelPadding=2.0,
    tickSize=10.0
}) => {
   
    const runtime = useWasmRuntime();
    const [mesh, setMesh] = useState(null);
    const style = [backgroundColor, meshColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding];

    useEffect(() => {
        // Create mesh
        if (runtime) setMesh(new runtime.InteractiveMesh(...shape)); 
    }, [runtime]);

    useEffect(() => {
        /*
        Draw the mesh
        */
        if (!runtime || !mesh) return;

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

    return {mesh, runtime};
};