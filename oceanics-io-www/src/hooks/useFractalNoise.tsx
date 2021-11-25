//@ts-nocheck
import { useEffect } from "react";


export const useFractalNoise = () => {


    useEffect(() => {
        const ctx = validContext();
        if (!fractal || !ctx) return;

        const { width, height } = ref.current;

        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: screenBuffer(width, height),
                    back: screenBuffer(width, height)
                }).map(([k, v]) => [k, createTexture({ctx, ...v})])),
            buffers: VertexArrayBuffers(ctx),
            framebuffer: ctx.createFramebuffer(),
            uniforms: {
                "u_screen" : ["i", 2],
                "u_opacity": ["f", 1.0]
            }
        });

    }, [ref]);


    useEffect(() => {

        const ctx = validContext();

        if (!fractal || !runtime || !ctx || !assets || !programs) return;
        
        const viewport = [0, 0, ref.current.width, ref.current.height];
    
        setPipeline([
            {
                program: programs.screen,
                textures: [
                    [assets.textures.state, 1],
                    [assets.textures.back, 2]
                ],
                parameters: ["u_screen", "u_opacity"],
                attributes: [assets.buffers.quad],
                framebuffer: [assets.framebuffer, assets.textures.screen],
                topology: [ctx.TRIANGLES, 6],
                viewport
            },
            {
                program: programs.draw,
                attributes: [assets.buffers.quad],
                framebuffer: [assets.framebuffer, assets.textures.screen],
                topology: [ctx.TRIANGLES, 6],
                viewport
            },
            {
                program: programs.screen,
                textures: [[assets.textures.screen, 2]],
                parameters: ["u_opacity"],
                attributes: [assets.buffers.quad],
                framebuffer: [null, null],
                topology: [ctx.TRIANGLES, 6],
                viewport
            }
        ]);
    }, [programs]);

    
}

export default useFractalNoise