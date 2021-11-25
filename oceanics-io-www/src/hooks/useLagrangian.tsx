// @ts-nocheck
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
import useColorMapTexture from "oceanics-io-ui/build/hooks/useColorMapTexture";

/**
 * Hook for lazy loading image data as texture.
 */
import useImageDataTexture from "./useImageDataTexture";

/**
 * Utility for creating stage executables
 */
import usePipelineStage from "./usePipelineStage";

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
export const useLagrangian = ({
    velocity: {
        source = null,
        metadataFile = null
    }, // passed on to Hook as args
    res = 16,
    colors = [
        [0.0, "#deababff"],
        [1.0, "#660066ff"],
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
     * Reference for using and cancelling setTimeout.
     */
    const timer = useRef(null);

    /**
     * Adjustable scalar to fire faster/slower than 60fps
     */
    const timeConstant = useRef(1.0);

    /**
     * Create a initial distribution of particle positions,
     * encoded as 4-byte colors.
     */
    useEffect(() => {
        if (worker.current)
            worker.current
                .initParticles(res)
                .then(setParticles)
                .catch(setError.bind(null, "There was a runtime error."));
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
        runtimeContext, 
        programs, 
        validContext, 
        VertexArrayBuffers,
        createTexture,
        setUniforms
    } = useGlslShaders({ 
        shaders: {
            screen: ["quad-vertex", "screen-fragment"],
            draw: ["draw-vertex", "draw-fragment"],
            update: ["quad-vertex", "update-fragment"],
        }
    });

    /**
     * Assets are our data
     */
    const [ assets, setAssets ] = useState(null);

    /**
     * Create color map
     */
    const colorMap = useColorMapTexture({width: 16, height: 16, colors});

    /**
     * Update values of uniforms.
     */
    useEffect(() => {
        if (validContext && metadata)
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
                "u_wind_res": ["f", [ref.current.width, ref.current.height]]
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
        if (imageData && createTexture) 
            setVelocity(createTexture({
                filter: "LINEAR", 
                data: imageData
            }));
    }, [ imageData, createTexture ]);
    
    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * 
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    useEffect(() => {
        if (createTexture && colorMap.texture)
            setAssets(createTexture({
                data: colorMap.texture, 
                filter: "LINEAR", 
                shape: [16, 16]
            }));   
    }, [ createTexture, colorMap.texture ]);

    /**
     * Order of textures is swapped after every render pass.
     */
    const textures = useRef(null);

    /**
     * Textures that are drawn to the screen.
     */
    const screenBuffers = useRef(null);

    /**
     * Create the textures.
     */
    useEffect(() => {
        if (!validContext || !createTexture) return;
        
        const { width, height } = ref.current;
        const size = width * height * 4;
        
        screenBuffers.current =
            Object.fromEntries(Object.entries({
                screen: { data: new Uint8Array(size), shape: [ width, height ], filter: "NEAREST" },
                back: { data: new Uint8Array(size), shape: [ width, height ],  filter: "NEAREST" },
            }).map(
                ([k, v]) => [k, createTexture(v)]
            ));
    }, [ validContext, createTexture ]);

    /**
     * Create the textures.
     */
    useEffect(() => {
        if (!validContext || !particles || !createTexture ) return;
          
        textures.current =
            Object.fromEntries(Object.entries({
                state: { data: particles, shape: [res, res], filter: "NEAREST" },
                previous: { data: particles, shape: [res, res], filter: "NEAREST" },
            }).map(
                ([k, v]) => [k, createTexture(v)]
            ));
    }, [ ref, particles, createTexture ]);

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


    const stageDeps = [ validContext, assets, framebuffer, programs, buffers ];
    const frontBufferDeps = [ validContext, programs, buffers ];

    /**
     * Render stage
     */
    const indexBufferStage = usePipelineStage(
        stageDeps, 
        (screen) => Object({
            program: programs.draw,
            textures: [[assets, 2]],
            attributes: [buffers.index],
            parameters: [...PARAMETER_MAP.wind, "u_point_size"],
            framebuffer: [framebuffer, screen],  // variable
            topology: [validContext.POINTS, 0, res * res],
            viewport: [0, 0, ref.current.width, ref.current.height]
        }) 
    );

    /**
     * Render stage
     */
    const backBufferStage = usePipelineStage(
        stageDeps, 
        (state, back, screen) => Object({
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
        })
    );

    /**
     * Render stage.
     */
    const frontBufferStage = usePipelineStage(
        frontBufferDeps, 
        (screen) => Object({
            program: programs.screen,
            textures: [[screen, 2]], // variable  
            parameters: PARAMETER_MAP.color,
            attributes: [buffers.quad],
            framebuffer: [null, null], 
            topology: [validContext.TRIANGLES, 0, 6],
            viewport: [0, 0, ref.current.width, ref.current.height],
        })
    );

    /**
     * Shader program.
     */
    const updateStage = usePipelineStage(
        stageDeps, 
        (previous) => Object({
            program: programs.update,
            textures: [[assets, 2]],
            parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
            attributes: [buffers.quad],
            framebuffer: [framebuffer, previous],  // re-use the old data buffer
            topology: [validContext.TRIANGLES, 0, 6],
            viewport: [0, 0, res, res]
        })
    );

    /**
     * Triggers for updating the rendering pipeline.
     */
    const renderDeps = [ runtimeContext, indexBufferStage, backBufferStage, frontBufferStage, updateStage ];

    /**
     * Use pipe line as an effect triggering state.
     */
    const [ pipeline, setPipeline ] = useState(null);

    /**
     * Set pipeline value to signal ready for rendering. The saved object
     * contains a `render()` function bound to a WebGL context. 
     * 
     * It also has a `stages()` function that produces an array of executable 
     * stages. This is required, because we need to pass in the texture handles
     * between steps to do double buffering.
     */
    useEffect(() => {
        if (renderDeps.every(x => !!x))  
            setPipeline({
                render: renderPipelineStage.bind(null, runtimeContext),
                stages: (back, screen, previous, state) => [
                    backBufferStage(state, back, screen), 
                    indexBufferStage(screen), // draw to front buffer
                    frontBufferStage(back), // write over previous buffer
                    updateStage(previous) // write over previous state
                ]
            });
    }, renderDeps);
    
    /**
     * Render function that calls itself recursively, swapping front/back buffers between
     * passes.
     * 
     * Triggered when pipeline of functions are ready. 
     */
    useEffect(() => {
        if (!pipeline || !textures.current || !screenBuffers.current) return;
        
        function render(back, screen, previous, state) {
            pipeline.stages(back, screen, previous, state).forEach(pipeline.render);
            timer.current = setTimeout(render, timeConstant.current * 17.0, screen, back, state, previous);
        };

        render(
            screenBuffers.current.back, 
            screenBuffers.current.screen, 
            textures.current.previous, 
            textures.current.state
        );

        return () => clearTimeout(timer.current);

    }, [pipeline, textures.current, screenBuffers.current]);

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

export default useLagrangian;