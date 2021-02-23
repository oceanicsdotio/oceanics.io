import { useEffect, useState, useRef } from "react";

/**
 * Shader hook
 */
import useGlslShaders from "./useGlslShaders";


/**
 * Dedicated worker loader
 */
import Worker from "./useLagrangianTest.worker.js";

/**
 * Mapping of uniforms to program components
 */
const parameters = {
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
    colors = {
        0.0: '#deababff',
        1.0: '#660066ff',
        
    },
    opacity = 0.92, // how fast the particle trails fade on each frame
    speed = 0.00007, // how fast the particles move
    diffusivity = 0.004,
    pointSize = 1.0,
    drop = 0.01, // how often the particles move to a random place
}) => {
   
    /**
     * Exported ref to draw textures to a secondary HTML canvas component
     */
    const preview = useRef(null);

    /**
     * Particle locations. Will be set by web worker from remote source,
     * procedure, or randomly. 
     */
    const [ particles, setParticles ] = useState(null);

    /**
     * Instantiate web worker reference for background tasks.
     */
    const worker = useRef(null);

    /**
     * Create worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * Create a initial distribution of particle positions,
     * encoded as 4-byte colors.
     */
    useEffect(() => {
        if (worker.current) 
            worker.current.initParticles(res).then(setParticles);
    }, [ worker ]);

    /**
     * Shader programs compiled from GLSL source. Comes with a recycled
     * Rust-WASM runtime. 
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
        renderPipeline
    } = useGlslShaders({ 
        shaders: {
            screen: ["quad-vertex", "screen-fragment"],
            draw: ["draw-vertex", "draw-fragment"],
            update: ["quad-vertex", "update-fragment"],
        }
    });

    /**
     * Paints a colormap to a hidden canvas and then samples it as 
     * a lookup table for speed calculations.
     */
    const shape = [16, 16];
    const size = shape[0] * shape[1];
    const [colorMap, setTexture] =  useState(null);

    /**
     * Create a temporary canvas element to paint a color
     * map to, then draw a gradient and extract a color
     * look up table from it.
     */
    useEffect(()=>{
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = 1;
    
        let gradient = ctx.createLinearGradient(0, 0, size, 0);
        Object.entries(colors).forEach(([stop, color]) => {
            gradient.addColorStop(+stop, color)
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, 1);
        
        setTexture({
            filter: "LINEAR", 
            data: new Uint8Array(ctx.getImageData(0, 0, size, 1).data), shape 
        });
        
    },[]);


    /**
     * Interpreting image formatted velocity data requires having
     * infomration about the range. 
     */
    const [ metadata, setMetadata ] = useState(null);

    /**
     * Fetch the metadata file. 
     */
    useEffect(() => {
        if (metadataFile && worker.current)
            worker.current.getImageMetadata(metadataFile).then(setMetadata);
    }, [ worker ]);

    /**
     * Container for handles to GPU interface
     */
    const [ imageData, setImageData ] = useState(null);

    /**
     * Use external data as a velocity field to force movement of particles
     */
    useEffect(()=>{
        if (!source) return;
      
        const img = new Image();
        img.addEventListener('load', () => {
            setImageData(img);
        }, {
            capture: true,
            once: true,
        });
        img.crossOrigin = source.includes(".") ? "" : undefined;
        img.src = source;
    },[]);


    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * 
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    useEffect(() => {
        const ctx = validContext();
        if (!ctx || !particles || !metadata || !colorMap || (source && !imageData)) return;
        
        const { width, height } = ref.current;
        const size = width * height * 4;
       
        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: { data: new Uint8Array(size), shape: [ width, height ] },
                    back: { data: new Uint8Array(size), shape: [ width, height ] },
                    state: { data: particles, shape: [res, res] },
                    previous: { data: particles, shape: [res, res] },
                    color: colorMap,
                    ...(imageData ? {uv: { filter: "LINEAR", data: imageData }} : {}),
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
    }, [ref, particles, metadata, colorMap, imageData]);

    /**
     * Display the wind data in a secondary 2D HTML canvas, for debugging
     * and interpretation. 
     */
    useEffect(() => {
        if (!preview || !preview.curent || !imageData) return;
        preview.current.getContext("2d").drawImage(imageData, 0, 0, preview.current.width, preview.current.height);
    }, [preview, imageData]);

    /**
     * Start the rendering loop
     */
    useEffect(() => {
        const ctx = validContext();
        if (!ctx || !programs || !assets || !metadata) return;

        let requestId;  
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
                    topology: [ctx.POINTS, res * res],
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

    /**
     * Resources available to parent Component or Hook.
     */
    return {ref}
};