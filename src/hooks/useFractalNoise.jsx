import { useEffect, useState, useRef } from "react";
import useGlslShaders from "../hooks/useGlslShaders";

/**
 * Make some noise
 */
export default ({
    opacity = 1.0 // how fast the image blends
}) => {
   
    const [assets, setAssets] = useState(null);
    const ref = useRef(null);

    const {
        programs,
        validContext,
        runtime,
        VertexArrayBuffers,
        createTexture,
        renderPipeline,
    } = useGlslShaders({
        ref, 
        shaders: {
            draw: ["noise-vertex", "noise-fragment"],
            screen: ["quad-vertex", "screen-fragment"]
        }
    });

    useEffect(() => {
        const ctx = validContext();
        if (!ctx) return;

        const { width, height } = ref.current;
        const shape = [width, height];
        const size = width * height * 4;

        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: { data: new Uint8Array(size), shape },
                    back: { data: new Uint8Array(size), shape }
                }).map(([k, v]) => [k, createTexture({ctx, ...v})])),
            buffers: VertexArrayBuffers(ctx),
            framebuffer: ctx.createFramebuffer(),
            uniforms: {
                "u_screen" : ["i", 2],
                "u_opacity": ["f", opacity]
            }
        });

    }, [ref]);


    useEffect(() => {

        const ctx = validContext();

        if (!runtime || !ctx || !assets || !programs) return;
        const { width, height } = ref.current;
    
        let requestId;
        let {textures: { back, state, screen }} = assets;
        
        const pipeline = [
            {
                program: programs.screen,
                textures: [
                    [state, 1],
                    [back, 2]
                ],
                attributes: [assets.buffers.quad],
                parameters: ["u_screen", "u_opacity"],
                framebuffer: [assets.framebuffer, screen],
                topology: [ctx.TRIANGLES, 6],
                viewport: [0, 0, width, height]
            },
            {
                program: programs.draw,
                attributes: [assets.buffers.quad],
                framebuffer: [assets.framebuffer, screen],
                topology: [ctx.TRIANGLES, 6],
                viewport: [0, 0, width, height]
            },
            {
                program: programs.screen,
                textures: [[screen, 2]],
                parameters: ["u_opacity"],
                attributes: [assets.buffers.quad],
                framebuffer: [null, null],
                topology: [ctx.TRIANGLES, 6],
                viewport: [0, 0, width, height],
                callback: () => [back, screen] = [screen, back]  // ! blend alternate frames
            }
        ];

        (function render() {
            renderPipeline(runtime, ctx, assets.uniforms, pipeline);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs]);

    return {ref};
};