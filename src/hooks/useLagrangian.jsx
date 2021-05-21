import { useEffect, useState, useRef } from "react";

import { 
    useGlslShaders,
    createTexture, 
    ArrayBuffer 
} from "./useGlslShaders";


import useColorMapTexture from "./useColorMapTexture";



const exec = (runtime, ctx, uniforms, {
    components: {
        tex=[],
        attrib=[],
        framebuffer: [handle=null, fb_tex=null],
        ...components
    },
    program={},
    draw_as: [type, count],
    viewport,
    callback = null
}) => {

    ctx.viewport(...viewport);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, handle);
    if (fb_tex) {
        ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, fb_tex, 0); 
    }
    try {
        ctx.useProgram(program.program);
    } catch (TypeError) {
        console.log("Error loading program", program)
        return;
    }

    tex.forEach(([tex, slot]) => runtime.bind_texture(ctx, tex, slot));
    attrib.forEach(([buffer, handle, numComponents]) => {
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
        ctx.enableVertexAttribArray(handle);
        ctx.vertexAttribPointer(handle, numComponents, ctx.FLOAT, false, 0, 0);
    });

    // Format and bind a value to each uniform variable in the context
    (components.uniforms || []).forEach((key) => {
        const [type, value] = uniforms[key];
        const size = value.length || 1;
        ctx[`uniform${size}${type}`](program[key], ...(size === 1 ? [value]: value))
    });

    if ("u_time" in program) {
        ctx[`uniform1f`](program["u_time"], performance.now());
    }

    ctx.drawArrays(type, 0, count);
    if (callback) callback();
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
    preview=null,
    showVelocityField=false,
    res = Math.ceil(Math.sqrt(4000)),
    opacity = 0.98, // how fast the particle trails fade on each frame
    speed = 0.3, // how fast the particles move
    drop = 0.01, // how often the particles move to a random place
    bump = 0.01 // drop rate increase relative to individual particle speed 
}) => {
   
    const shaders = {
        draw: ["draw-vertex", "draw-fragment"],
        screen: ["quad-vertex", "screen-fragment"],
        update: ["quad-vertex", "update-fragment"]
    };

    const positions = [0, 0, res, res];
    const count = res * res;
  
    const ref = useRef(null);
    const [assets, setAssets] = useState(null);
    
    const { programs } = useGlslShaders({ref, shaders});
    const colorMap = useColorMapTexture({
        width: 16,
        height: 16,
        colors: [
            [0.0, '#dd7700'],
            [1.0, '#660066']
        ]
    })


     /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [runtime, setRuntime] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    }, []);

    
    /**
    * Create a random distribution of particle positions,
    * encoded as 4-byte colors. 
    * This is the default behavior, but it is broken out as a 
    * effect so that additional logic can be applied, 
    * or initial positions can be loaded from a DB or file.
    */
    const [particles, setParticles] = useState(null);
    useEffect(() => {
        setParticles(
            new Uint8Array(Array.from(
                { length: count * 4 }, 
                () => Math.floor(Math.random() * 256)
            ))
        );
    }, []);


    /**
    * Fetch the metadata file. 
    * This has no dependencies and will probably be executed first. 
    * In the future this may support static files or DB queries. 
    */
    const [metadata, setMetadata] = useState(null);
    useEffect(() => {
        fetch(metadataFile)
            .then(r => r.json())
            .then(meta => {setMetadata(meta)})
            .catch(err => {
                console.log("Metadata Error", err)
            });
    }, []);

    
    /**
    * Generate assets and handles for rendering to canvas.
    * Use transducer to replace configs with texture instances.
    * This is executed exactly once after the canvas is created,
    * and the initial positions have been loaded or generated
    */
    useEffect(() => {
        if (!ref || !ref.current || !particles || !metadata || !colorMap) return;

        const { width, height } = ref.current;
        const ctx = ref.current.getContext("webgl");
        const shape = [width, height];
        const { u, v } = metadata;
        const size = width * height * 4;

        const img = new Image();
        img.addEventListener('load', () => {

            setAssets({
                image: img,
                textures: 
                    Object.fromEntries(Object.entries({
                        screen: { data: new Uint8Array(size), shape },
                        back: { data: new Uint8Array(size), shape },
                        state: { data: particles, shape: [res, res] },
                        previous: { data: particles, shape: [res, res] },
                        color: { data: colorMap.texture, filter: "LINEAR", shape: [16, 16]},
                        uv: { filter: "LINEAR", data: img },
                    }).map(
                        ([k, v]) => [k, createTexture({ctx: ctx, ...v})]
                    )),
                buffers: {
                    quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
                    index: new ArrayBuffer(ctx, particles)
                },
                framebuffer: ctx.createFramebuffer(),
                uniforms: {
                    "u_screen" : ["i", 2],
                    "u_opacity": ["f", opacity],
                    "u_wind": ["i", 0],
                    "u_particles": ["i", 1],
                    "u_color_ramp": ["i", 2],
                    "u_particles_res": ["f", res],
                    "u_wind_max": ["f", [u.max, v.max]],
                    "u_wind_min": ["f", [u.min, v.min]],
                    "speed": ["f", speed],
                    "drop": ["f", drop],
                    "bump": ["f", bump],
                    "seed": ["f", Math.random()],
                    "u_wind_res": ["f", [width, height]]
                }
            });
        }, {
            capture: true,
            once: true,
        });
        img.crossOrigin = source.includes(".") ? "" : undefined;
        img.src = source;

    }, [ref, particles, metadata, colorMap]);


    useEffect(() => {

        let requestId;
        if (!programs || !ref.current || !assets || !metadata) return;

        const { width, height } = ref.current;
        const ctx = ref.current.getContext("webgl");

        if (!ctx) return;

        const world = [0, 0, width, height];
        const {
            textures: { uv, color, ...textures },
            buffers: { quad, index },
            framebuffer,
            uniforms
        } = assets;
        const { screen, draw, update } = programs;

        let { back, previous, state } = textures;
        const quadBuffer = [
            [quad.buffer, "a_pos", 2]
        ];
        const triangles = [ctx.TRIANGLES, 6];

        const windParams = ["u_wind", "u_particles", "u_color_ramp", "u_particles_res", "u_wind_max", "u_wind_min"];

        /**
        Draw to front buffer
        */
        (function render() {

            const steps_a = [{
                program: screen,
                components: {
                    tex: [
                        [uv, 0],
                        [state, 1],
                        [back, 2]
                    ],
                    attrib: quadBuffer,
                    uniforms: ["u_screen", "u_opacity"],
                    framebuffer: [framebuffer, textures.screen]
                },
                draw_as: triangles,
                viewport: world
            },{
                program: draw,
                components: {
                    tex: [[color, 2]],
                    attrib: [[index.buffer, "a_index", 1]],
                    uniforms: windParams,
                    framebuffer: [framebuffer, textures.screen]
                },
                draw_as: [ctx.POINTS, res * res],
                viewport: world
            }];
            
            const steps_b = [{
                program: screen,
                components: {
                    tex: [[textures.screen, 2]],
                    uniforms: ["u_color_ramp", "u_opacity"],
                    attrib: quadBuffer,
                    framebuffer: [null, null]
                },
                draw_as: triangles,
                viewport: world,
                callback: () => [back, textures.screen] = [textures.screen, back]  // ! blend alternate frames
            },{
                program: update,
                components: {
                    tex: [[textures.color, 2]],
                    uniforms: ["speed",  "drop", 
                     "bump", "seed", "u_wind_res", ...windParams],
                    attrib: quadBuffer,
                    framebuffer: [framebuffer, previous]
                },
                draw_as: triangles,
                viewport: positions,
                callback: () => [state, previous] = [previous, state] // use previous pass to calculate next position
            }];
            
            [...steps_a, ...steps_b].forEach(x => exec(runtime, ctx, uniforms, x));

            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs]);


    return {ref}
};