import React, { useEffect, useState, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import { StyledCanvas } from "../components/Particles";


export class ArrayBuffer {
    constructor(ctx, data) {
        this.buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
    }
}


export const getColorRamp = (colors) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 1;

    let gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (let stop in colors) {
        gradient.addColorStop(+stop, colors[stop]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
};


export const compileShaders = (runtime, ref, assets, shaders, setPrograms, setReady) => {
    /*
    IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
    shaders as programs.

    This is executed only once, after the WASM runtime is loaded. 
    */

    return () => {
        if (!runtime || !ref.current || !assets) return;
        const ctx = ref.current.getContext("webgl");
        if (!ctx) return;
    
        (async () => {
            
            const shaderSource = {};  // memoize the shaders as they are loeaded
            const compiled = Object.fromEntries(await Promise.all(Object.entries(shaders).map(async ([programName, pair]) => {
    
                let [vs, fs] = pair.map(async (file) => {
                    if (!(file in shaderSource)) shaderSource[file] = await runtime.fetch_text(`/${file}.glsl`)
                    return shaderSource[file];
                });
                const program = runtime.create_program(ctx, await vs, await fs);
                let wrapper = { program };
                for (let ii = 0; ii < ctx.getProgramParameter(program, ctx.ACTIVE_ATTRIBUTES); ii++) {
                    const { name } = ctx.getActiveAttrib(program, ii);
                    wrapper[name] = ctx.getAttribLocation(program, name);
                }
                for (let ii = 0; ii < ctx.getProgramParameter(program, ctx.ACTIVE_UNIFORMS); ii++) {
                    const { name } = ctx.getActiveUniform(program, ii);
                    wrapper[name] = ctx.getUniformLocation(program, name);
                }
                return [programName, wrapper];
            })));
    
            console.log("Compiled shader programs to GPU.");
    
            setPrograms(compiled);
            setReady(true);
    
        })();
    }
}


export const extractUniforms = (keys, uniforms) => keys.map(k => [k, uniforms[k]]);


export const exec = (runtime, ctx, uniforms, {
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

}



export const createTexture = (ctx) => {
    return ([k, { filter = ctx.NEAREST, data, shape = [null, null] }]) => {

        let texture = ctx.createTexture();

        const textureType = ctx.TEXTURE_2D;
        const args = data instanceof Uint8Array ? [...shape, 0] : [];

        ctx.bindTexture(textureType, texture);
        const textureArgs = [textureType, 0, ctx.RGBA, ...args, ctx.RGBA, ctx.UNSIGNED_BYTE, data];

        try {
            ctx.texImage2D(...textureArgs);
        } catch (err) {
            throw TypeError;
        }

        [
            [ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE],
            [ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE],
            [ctx.TEXTURE_MIN_FILTER, filter],
            [ctx.TEXTURE_MAG_FILTER, filter]
        ].forEach(
            ([a, b]) => { ctx.texParameteri(textureType, a, b) }
        );
        ctx.bindTexture(textureType, null);  // prevent accidental use

        return [k, texture]
    }
};

export default ({
    res = Math.ceil(Math.sqrt(1000)),
    metadataFile,
    showVelocityField=false,
    source,
    colors = {
        0.0: '#dd7700',
        1.0: '#660066'
    },
    opacity = 0.98, // how fast the particle trails fade on each frame
    speed = 0.3, // how fast the particles move
    drop = 0.01, // how often the particles move to a random place
    bump = 0.01 // drop rate increase relative to individual particle speed 
}) => {
    /*
    Use WebGL to calculate particle trajectories from velocity data. This example uses wind
    data to move particles around the globe. 

    The velocity field is static, but in the future the component will support pulling frames
    from video or gif formats. 
    */

    const positions = [0, 0, res, res];
    const ref = useRef(null);
    const preview = useRef(null);

    const [ready, setReady] = useState(false);
    const [assets, setAssets] = useState(null);
    const [runtime, setRuntime] = useState(null);
    const [programs, setPrograms] = useState(null);
    const [particles, setParticles] = useState(null);
    const [metadata, setMetadata] = useState(null);

    const shaders = {
        draw: ["draw-vertex", "draw-fragment"],
        screen: ["quad-vertex", "screen-fragment"],
        update: ["quad-vertex", "update-fragment"]
    };



    useEffect(() => {
        /*
        Create a random distribution of particle positions encoded as 4-byte colors.

        This is the default behavior, but it is broken out as a effect so that additional logic
        can be applied, or initial positions can be loaded from a database or static file.
        
        */
        const count = res * res;
        setParticles(new Uint8Array(Array.from({ length: count * 4 }, () => Math.floor(Math.random() * 256))));
        console.log(`Prefetch ${count} particle positions.`);
    }, []);

    useEffect(() => {
        /*
        Fetch the metadata file. This has no dependencies and will probably be executed first. 

        In the future this should support loading either static files, or making database queries. 
        */
        (async () => {
            setMetadata(await fetch(metadataFile).then(r => r.json()));
            console.log(`Prefetch metadata (${metadataFile}).`);
        })()
    }, []);

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
        /*
        Generate assets and handles for rendering once the canvas has loaded.

        use transducer to replace configs with texture instances.

        This is executed exactly once after the canvas has been created and the initial positions have been
        loaded or generated
        */

        if (!ref.current || !particles || !metadata) return;

        const img = new Image();
        img.addEventListener('load', () => {

            const { width, height } = ref.current;
            const ctx = ref.current.getContext("webgl");
            const shape = [width, height];
            const { u, v } = metadata;

            const textures = Object.fromEntries(Object.entries({
                screen: { data: new Uint8Array(width * height * 4), shape },
                back: { data: new Uint8Array(width * height * 4), shape },
                state: { data: particles, shape: [res, res] },
                previous: { data: particles, shape: [res, res] },
                color: { filter: ctx.LINEAR, data: getColorRamp(colors), shape: [16, 16] },
                uv: { filter: ctx.LINEAR, data: img },
            }).map(x => createTexture(ctx)(x)));

            setAssets({
                image: img,
                textures,
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

            console.log(`Prefetch image data (${source}) and create GPU assets.`);
        }, {
            capture: true,
            once: true,
        });
        img.src = source;

    }, [ref, particles, metadata]);

    useEffect(compileShaders(runtime, ref, assets, shaders, setPrograms, setReady), [runtime, assets]);

    useEffect(() => {

        let requestId;
        if (!runtime || !ref.current || !assets || !metadata || !ready) return;

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


        (function render() {

        
            /*
            Draw to front buffer
            */

            
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
                    uniforms: ["u_wind", "u_particles", "u_color_ramp", "u_particles_res", "u_wind_max", "u_wind_min"],
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
                    uniforms: ["u_wind", "u_particles", "u_color_ramp", "u_particles_res", "u_wind_max", "u_wind_min","speed",  "drop", 
                     "bump", "seed", "u_wind_res"],
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
    }, [programs, ready]);


    useEffect(() => {
        /*
        Display the wind data in a 2D HTML canvas, for debugging
        and interpretation. 
        */
        if (!showVelocityField || !preview.current || !assets || !assets.image) return;

        const { width, height } = preview.current;
        let ctx = preview.current.getContext('2d');
        ctx.drawImage(assets.image, 0, 0, width, height);

    }, [preview, assets]);


    return (
        <>
            <StyledCanvas ref={ref} />
            {showVelocityField ? <StyledCanvas ref={preview} /> : null}
        </>
    )
};