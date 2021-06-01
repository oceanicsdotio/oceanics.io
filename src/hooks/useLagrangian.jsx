/**
 * React, just friends because it's a hook. 
 */
import { useEffect, useState, useRef } from "react";

/**
 * Shader hook. We keep this separate for use by other implementations. 
 */
import useGlslShaders, {renderPipelineStage} from "./useGlslShaders";

/**
 * Color map texture for lookups.
 */
import useColorMapTexture from "./useColorMapTexture";

/**
 * Dedicated worker loader.
 */
import useWasmWorkers from "./useWasmWorkers";

/**
 * Hook for lazy loading image data as texture.
 */
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
    velocity: {
        source = null,
        metadataFile = null
    }, // passed on to Hook as args
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
    const { preview, imageData, metadata } = useImageDataTexture({ source, metadataFile });

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
        if (worker.current)
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
     * to something informative, like number of particles.
     * 
     * Set an error message if necessary.
     */
    useEffect(() => {
        if (particles || error) setMessage(error ? error : `Ichthyoid (N=${res*res})`);
    }, [ particles, error ]);

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

    /**
     * Uniforms are non-texture values applied to each fragment. 
     */
    const [ uniforms, setUniforms ] = useState(null);

    /**
     * Update values of uniforms.
     */
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
     * Points and window buffers for generic drawArray rendering
     */
    const [ buffers, setBuffers ] = useState(null);

    /**
     * Once we have a valid context and initial positions, save the array buffers.
     * This may not be strictly necessary. 
     */
    useEffect(() => {
        if (validContext && particles)
            setBuffers(VertexArrayBuffers(validContext, particles));
    }, [ validContext, particles ]);

    /**
     * Break out velocity texture, we want this to be optional.
     */
    const [ velocity, setVelocity ] = useState(null);

    /**
     * Create the UV velocity texture
     */
    useEffect(() => {
        if (imageData && validContext) 
            setVelocity(createTexture({
                ctx: validContext, 
                filter: "LINEAR", 
                data: imageData
            }));
    }, [ imageData, validContext ]);
    
    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * 
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    const assetDeps = [ validContext, colorMap.texture ]
    useEffect(() => {
        if (assetDeps.some(x => !x)) return;
        
        setAssets(
            Object.fromEntries(Object.entries({
                color: { data: colorMap.texture, filter: "LINEAR", shape: [16, 16] },
            }).map(
                ([k, v]) => [k, createTexture({ctx: validContext, ...v})]
            ))
        );
    }, assetDeps);

    /**
     * Order of textures is swapped after every render pass.
     * 
     * TODO: This should be useRef
     */
    const textures = useRef(null);

    /**
     * Create the textures.
     */
    useEffect(() => {
        if (!validContext || !particles ) return;
        
        const { width, height } = ref.current;
        const size = width * height * 4;
       
        textures.current =
            Object.fromEntries(Object.entries({
                screen: { data: new Uint8Array(size), shape: [ width, height ] },
                back: { data: new Uint8Array(size), shape: [ width, height ] },
                state: { data: particles, shape: [res, res] },
                previous: { data: particles, shape: [res, res] },
            }).map(
                ([k, v]) => [k, createTexture({ctx: validContext, ...v})]
            ));
       
    }, [ ref, particles ]);

    /**
     * Save framebuffer reference. This should be constant, but needs
     * a valid WebGL constant. 
     */
    const [ framebuffer, setFramebuffer ] = useState(null);

    /**
     * Save reference 
     */
    useEffect(() => {
        if (!validContext) return;
        setFramebuffer(validContext.createFramebuffer());
    }, [ validContext ]);

    /**
     * Package up our runtime for easy access. Will pass this to
     * stage functions. 
     */
    const [ runtimeContext, setRuntimeContext ] = useState(null);

    /**
     * Save the runtime information
     */
    useEffect(() => {
        if (!runtime || !validContext || !uniforms) return;
        setRuntimeContext({runtime, ctx: validContext, uniforms});
    }, [ runtime, validContext, uniforms ]);

    const stageDeps = [ validContext, assets, framebuffer, programs, buffers ];

    /**
     * Render stage
     */
    const [ indexBufferStage, setIndexBufferStage ] = useState(null);

    /**
     * Render stage function
     */
    useEffect(() => {
        if (stageDeps.some(x=>!x)) return;

        setIndexBufferStage(() => (screen) => () => Object({
            program: programs.draw,
            textures: [[assets.color, 2]],
            attributes: [buffers.index],
            parameters: [...PARAMETER_MAP.wind, "u_point_size"],
            framebuffer: [framebuffer, screen],  // variable
            topology: [validContext.POINTS, 0, res * res],
            viewport: [0, 0, ref.current.width, ref.current.height]
        }));
    }, stageDeps);

    /**
     * Render stage
     */
    const [ backBufferStage, setBackBufferStage ] = useState(null);

    /**
     * Create render stage function
     */
    useEffect(() => {
        if (stageDeps.some(x=>!x)) return;

        setBackBufferStage(() => (state, back, screen) => () => Object({
            program: programs.screen,
            textures: [
                [velocity, 0],
                [state, 1],  // variable
                [back, 2]  // variable
            ],
            attributes: [buffers.quad],
            parameters: PARAMETER_MAP.screen,
            framebuffer: [framebuffer, screen],  // variable
            topology: [validContext.TRIANGLES, 0, 6],
            viewport: [0, 0, ref.current.width, ref.current.height]
        }));
    }, stageDeps);

    /**
     * Render stage
     */
    const [ frontBufferStage, setFrontBufferStage ] = useState(null);

    /**
     * 
     */
    useEffect(() => {
        if (!validContext || !programs || !buffers) return;

        setFrontBufferStage(() => (screen) => () => Object({
            program: programs.screen,
            textures: [[screen, 2]], // variable  
            parameters: PARAMETER_MAP.color,
            attributes: [buffers.quad],
            framebuffer: [null, null], 
            topology: [validContext.TRIANGLES, 0, 6],
            viewport: [0, 0, ref.current.width, ref.current.height],
        }));
    }, [validContext, programs, buffers]);

    const [ updateStage, setUpdateStage ] = useState(null);

    useEffect(() => {
        if (stageDeps.some(x=>!x)) return;

        setUpdateStage(() => (previous) => () => Object({
            program: programs.update,
            textures: [[assets.color, 2]],
            parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
            attributes: [buffers.quad],
            framebuffer: [framebuffer, previous],  // re-use the old data buffer
            topology: [validContext.TRIANGLES, 0, 6],
            viewport: [0, 0, res, res]
        }));
    }, stageDeps);


    /**
     * Reference for using and cancelling setTimeout.
     */
    const timer = useRef(null);

    /**
     * Adjustable scalar to fire faster/slower than 60fps
     */
    const timeConstant = useRef(1.0);

    /**
     * Start the rendering loop
     */
    const renderDeps = [textures.current, runtimeContext, indexBufferStage, backBufferStage, frontBufferStage, updateStage];

    
    /**
     * Render function that calls itself recursively, swapping front/back buffers between
     * passes.
     */
    useEffect(() => {
        if (renderDeps.some(x => !x)) return;

        
        function render(back, screen, previous, state) {
            [
                backBufferStage(state, back, screen), 
                indexBufferStage(screen), 
                frontBufferStage(screen), 
                updateStage(previous)
            ].forEach(renderPipelineStage.bind(null, runtimeContext));
    
            timer.current = setTimeout(render, timeConstant.current * 17.0, screen, back, state, previous);
        };

        render(
            textures.current.back, 
            textures.current.screen, 
            textures.current.previous, 
            textures.current.state
        );

        return () => clearTimeout(timer.current);

    }, renderDeps);

    /**
     * In a stand alone loop, update the timeConstant to control
     * the time between render passes. 
     * 
     * This decouples that control, so that it can be bound to UI
     * elements, for example. 
     */
    useEffect(() => {
       
        const simulateControl = () => {
            timeConstant.current = 0.5*((Math.sin(0.005*performance.now())) + 1.0);
        };

        const loop = setInterval(simulateControl, 30.0);

        return () => clearInterval(loop);
    }, []);
    /**
     * Resources available to parent Component or Hook.
     */
    return { ref, message, preview, timeConstant }
};