import { useEffect } from "react";


 /**
  * Use WebGL to calculate particle trajectories from velocity data. 
  * This example uses wind data to move particles around the globe. 
  * The velocity field is static, but in the future the component 
  * will support pulling frames from video or gif formats. 
  */
export const useLagrangianTrajectory = ({
    res = 16,
    opacity = 0.92, // how fast the particle trails fade on each frame
    speed = 0.00007, // how fast the particles move
    diffusivity = 0.004,
    pointSize = 1.0,
    drop = 0.01, // how often the particles move to a random place
}) => { 
    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * 
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    useEffect(() => {
        const ctx = validContext();
     
        const canvas: HTMLCanvasElement = ref.current;
        const { width, height } = canvas;
        const size = width * height * 4;
       
        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: { data: new Uint8Array(size), shape: [ width, height ] },
                    back: { data: new Uint8Array(size), shape: [ width, height ] },
                    state: { data: particles, shape: [res, res] },
                    previous: { data: particles, shape: [res, res] },
                    color: { data: colorMap.texture, filter: "LINEAR", shape: [16, 16] },
                    uv: { filter: "LINEAR", data: imageData },
                }).map(
                    ([k, v]) => [k, createTexture({ctx: ctx, ...v})]
                )),
            buffers: VertexArrayBuffers(ctx, particles),
            framebuffer: ctx.createFramebuffer(),
            uniforms: {
                "u_screen" : ["i", 2],
                "u_opacity": ["f", opacity],
                "u_wind": ["i", 0],
                "u_particles": ["i", 1],
                "u_color_ramp": ["i", 2],
                "u_particles_res": ["f", res],
                "u_point_size": ["f", pointSize],
                "u_wind_max": ["f", [metadata.u.max, metadata.v.max]],
                "u_wind_min": ["f", [metadata.u.min, metadata.v.min]],
                "speed": ["f", speed],
                "diffusivity": ["f", diffusivity],
                "drop": ["f", drop],
                "seed": ["f", Math.random()],
                "u_wind_res": ["f", [width, height]]
            }
        });
    }, [ ref, particles, metadata, colorMap.texture, imageData ]);

    /**
     * Start the rendering loop
     */
    useEffect(() => {
        const ctx = validContext();
        if (!ctx || !programs || !assets || !metadata) return;

        let requestId: number;  
        let {
            textures: { 
                back, 
                previous, 
                state, 
                screen 
            },
        } = assets;  // non-static assets
 
        (function render() {
            const pipeline = [
                {
                    program: programs.screen,
                    textures: [
                        [assets.textures.uv, 0],
                        [state, 1],  // variable
                        [back, 2]  // variable
                    ],
                    attributes: [assets.buffers.quad],
                    parameters: parameters.screen,
                    framebuffer: [assets.framebuffer, screen],  // variable
                    topology: [ctx.TRIANGLES, 6],
                    viewport: [0, 0, ref.current.width, ref.current.height]
                },
                {
                    program: programs.draw,
                    textures: [[assets.textures.color, 2]],
                    attributes: [assets.buffers.index],
                    parameters: [...parameters.wind, "u_point_size"],
                    framebuffer: [assets.framebuffer, screen],  // variable
                    topology: [ctx.LINE_STRIP, res * res],
                    viewport: [0, 0, ref.current.width, ref.current.height]
                },
                {
                    program: programs.screen,
                    textures: [[screen, 2]], // variable  
                    parameters: parameters.color,
                    attributes: [assets.buffers.quad],
                    framebuffer: [null, null], 
                    topology: [ctx.TRIANGLES, 6],
                    viewport: [0, 0, ref.current.width, ref.current.height],
                    callback: () => [back, screen] = [screen, back]  // blend frames
                }, 
                {
                    program: programs.update,
                    textures: [[assets.textures.color, 2]],
                    parameters: [...parameters.sim, ...parameters.wind],
                    attributes: [assets.buffers.quad],
                    framebuffer: [assets.framebuffer, previous],  // re-use the old data buffer
                    topology: [ctx.TRIANGLES, 6],
                    viewport: [0, 0, res, res],  
                    callback: () => [state, previous] = [previous, state]  // use previous pass to calculate next position
                }
            ];
            
            renderPipeline(runtime, ctx, assets.uniforms, pipeline);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs, assets]);
};
