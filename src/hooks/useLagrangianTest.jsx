import { useEffect, useState, useRef } from "react";
import { useGlslShaders, createTexture, VertexArrayBuffers, renderPipeline } from "./useGlslShaders";
import useCanvasColorRamp from "./useCanvasColorRamp";

/**
 * Mapping of uniforms to program components
 */
const parameters = {
    screen: ["u_screen", "u_opacity"],
    sim: ["speed",  "drop",  "bump", "seed", "u_wind_res"],
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
        0.0: '#dd7700',
        0.5: '#deabab',
        1.0: '#660066'
    },
    opacity = 0.98, // how fast the particle trails fade on each frame
    speed = 0.3, // how fast the particles move
    drop = 0.01, // how often the particles move to a random place
    bump = 0.01 // drop rate increase relative to individual particle speed 
}) => {
   
    /**
     * Exported ref to assign to an HTML canvas component
     */
    const ref = useRef(null);

    /**
     * Exported ref to draw textures to a secondary HTML canvas component
     */
    const preview = useRef(null);

    /**
     * Shader programs compiled from GLSL source. Comes with a recycled
     * Rust-WASM runtime. 
     */
    const { runtime, programs, validContext } = useGlslShaders({
        ref, 
        shaders: {
            screen: ["quad-vertex", "screen-fragment"],
            draw: ["draw-vertex", "draw-fragment"],
            update: ["quad-vertex", "update-fragment"]
        }
    });

    /**
     * Paints a colormap to a hidden canvas and then samples it as 
     * a lookup table for speed calculations.
     */
    const colorMap = useCanvasColorRamp({colors});

    /**
     * Particle locations
     */
    const [ particles, setParticles ] = useState(null);

    /**
    * Create a random distribution of particle positions,
    * encoded as 4-byte colors. 
    * 
    * This is the default behavior, but it is broken out as a 
    * effect so that additional logic can be applied, 
    * or initial positions can be loaded from a DB or file.
    */
    useEffect(() => {
        setParticles(
            new Uint8Array(Array.from(
                { length: res * res * 4 }, 
                () => Math.floor(Math.random() * 256)
            ))
        );
    }, []);

    /**
     * Interpreting image formatted velocity data requires having
     * infomration about the range. 
     */
    const [ metadata, setMetadata ] = useState(null);

    /**
     * Fetch the metadata file. 
     * 
     * This has no dependencies and will probably be executed first. 
     * In the future this may support static files or DB queries. 
     */
    useEffect(() => {
        if (!metadataFile) return;
        fetch(metadataFile)
            .then(r => r.json())
            .then(setMetadata)
            .catch(err => {
                console.log("Metadata Error", err)
            });
    }, []);


    /**
     * Container for handles to GPU interface
     */
    const [ assets, setAssets ] = useState(null);

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
                "u_wind_max": ["f", [metadata.u.max, metadata.v.max]],
                "u_wind_min": ["f", [metadata.u.min, metadata.v.min]],
                "speed": ["f", speed],
                "drop": ["f", drop],
                "bump": ["f", bump],
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

        // const nextPipeline = ({ 
        //     back, 
        //     previous, 
        //     state, 
        //     screen 
        // }) => []

        
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
                    parameters: parameters.wind,
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