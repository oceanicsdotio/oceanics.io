/**
 * React, just friends because it's a hook. 
 */
import { useEffect, useState } from "react";

/**
 * Shader hook. We keep this separate for use by other implementations. 
 */
import useGlslShaders, {renderPipelineStage} from "./useGlslShaders";

/**
 * Color map texture for lookups
 */
import useColorMapTexture from "./useColorMapTexture";

/**
 * Dedicated worker loader
 */
import useWasmWorkers from "./useWasmWorkers";
import useImageDataTexture from "./useImageDataTexture";

/**
 * Mapping of uniforms to program components
 */
const PARAMETER_MAP = {
    screen: ["u_screen", "u_opacity"],
    sim: ["speed",  "drop",  "seed", "u_wind_res", "diffusivity"],
    wind: ["u_wind", "u_particles", "u_color_ramp", "u_particles_res", "u_wind_max", "u_wind_min"],
    color: ["u_color_ramp", "u_opacity"],
};

 /**
  * Use WebGL to calculate particle trajectories from velocity data. 
  * This example uses wind data to move particles around the globe. 
  * The velocity field is static, but in the future the component 
  * will support pulling frames from video or gif formats. 
  */
export default ({
    source,
    metadataFile,
    res = 16,
    colors = [
        [0.0, '#deababff'],
        [1.0, '#660066ff'],
    ],
    opacity = 0.92, // how fast the particle trails fade on each frame
    speed = 0.00007, // how fast the particles move
    diffusivity = 0.004,
    pointSize = 1.0,
    drop = 0.01, // how often the particles move to a random place
}) => {
   
    /**
     * Exported ref to draw textures to a secondary HTML canvas component
     */
    const { preview, imageData, metadata } = useImageDataTexture({
        source,
        metadataFile,
    });

    /**
     * Particle locations. Will be set by web worker from remote source,
     * procedure, or randomly. 
     */
    const [ particles, setParticles ] = useState(null);

    /**
     * Error flag
     */
    const [ error, setError ] = useState(null);

    /**
     * Load worker
     */
    const { worker } = useWasmWorkers();

    /**
     * Create a initial distribution of particle positions,
     * encoded as 4-byte colors.
     */
    useEffect(() => {
        if (!worker.current) return;

        worker.current
            .initParticles(res)
            .then(setParticles)
            .catch(() => {setError("There was a runtime error.")});

    }, [ worker ]);

    /**
     * Message for user interface, passed out to parent component.
     */
    const [ message, setMessage ] = useState("Working...");

    /**
     * When we have some information ready, set the status message
     * to something informative, like number of particles
     */
    useEffect(() => {
        if (particles) setMessage(`Ichthyoid (N=${res*res})`);
    }, [ particles ]);

    /**
     * Set an error message in necessary.
     */
    useEffect(() => {
        if (error) setMessage(error);
    }, [ error ]);

    /**
     * Shader programs compiled from GLSL source. 
     * 
     * Comes with a recycled Rust-WASM runtime. 
     */
    const { 
        ref,
        assets,
        setAssets,
        runtime, 
        programs, 
        validContext, 
        VertexArrayBuffers,
        createTexture,
    } = useGlslShaders({ 
        shaders: {
            screen: ["quad-vertex", "screen-fragment"],
            draw: ["draw-vertex", "draw-fragment"],
            update: ["quad-vertex", "update-fragment"],
        }
    });

    /**
     * Create color map
     */
    const colorMap = useColorMapTexture({width: 16, height: 16, colors});


    const [uniforms, setUniforms] = useState(null);

    useEffect(() => {
        if (!validContext || !metadata) return;
        
        const { width, height } = ref.current;
       
        setUniforms({
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
        });
    }, [ validContext, metadata ]);

    
    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * 
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    useEffect(() => {
        if (!validContext || !particles || !metadata || !colorMap.texture || (source && !imageData)) return;
        
        const { width, height } = ref.current;
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
                    ([k, v]) => [k, createTexture({ctx: validContext, ...v})]
                )),
            buffers: VertexArrayBuffers(validContext, particles),
            framebuffer: validContext.createFramebuffer()
        });
    }, [ ref, particles, metadata, colorMap.texture, imageData ]);

    const [ runtimeContext, setRuntimeContext ] = useState(null);

    useEffect(() => {
        if (!runtime || !validContext || !uniforms) return;
        setRuntimeContext({runtime, ctx: validContext, uniforms});
    }, [runtime, validContext, uniforms]);


    /**
     * Start the rendering loop
     */
    useEffect(() => {
        if (!runtimeContext || !programs || !assets || !metadata) return;

        let requestId;  
        let {
            textures: { 
                back, 
                previous, 
                state, 
                screen 
            },
        } = assets;  // non-static assets

        const drawIndexBufferStage = () => Object({
            program: programs.draw,
            textures: [[assets.textures.color, 2]],
            attributes: [assets.buffers.index],
            parameters: [...PARAMETER_MAP.wind, "u_point_size"],
            framebuffer: [assets.framebuffer, screen],  // variable
            topology: [validContext.POINTS, res * res],
            viewport: [0, 0, ref.current.width, ref.current.height]
        });

        const drawBackBufferStage = () => Object({
            program: programs.screen,
            textures: [
                [assets.textures.uv, 0],
                [state, 1],  // variable
                [back, 2]  // variable
            ],
            attributes: [assets.buffers.quad],
            parameters: PARAMETER_MAP.screen,
            framebuffer: [assets.framebuffer, screen],  // variable
            topology: [validContext.TRIANGLES, 6],
            viewport: [0, 0, ref.current.width, ref.current.height]
        });

        const drawUpdateStage = () => Object({
            program: programs.update,
            textures: [[assets.textures.color, 2]],
            parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
            attributes: [assets.buffers.quad],
            framebuffer: [assets.framebuffer, previous],  // re-use the old data buffer
            topology: [validContext.TRIANGLES, 6],
            viewport: [0, 0, res, res]
        });

        (function render() {

            /**
             * Execute a callback function, currently intended to swap buffers between rendering
             * steps when using double buffering to/from textures for state and rendering targets.
             */
            [
                renderPipelineStage(runtimeContext, drawBackBufferStage),
                renderPipelineStage(runtimeContext, drawIndexBufferStage),
                renderPipelineStage(runtimeContext, () => Object({
                    program: programs.screen,
                    textures: [[screen, 2]], // variable  
                    parameters: PARAMETER_MAP.color,
                    attributes: [assets.buffers.quad],
                    framebuffer: [null, null], 
                    topology: [validContext.TRIANGLES, 6],
                    viewport: [0, 0, ref.current.width, ref.current.height],
                })),
                () => [back, screen] = [screen, back],
                renderPipelineStage(runtimeContext, drawUpdateStage),
                () => [state, previous] = [previous, state]
            ].forEach(stage => {stage()});
            
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [runtimeContext, programs, assets]);

    /**
     * Resources available to parent Component or Hook.
     */
    return {ref, message, preview}
};