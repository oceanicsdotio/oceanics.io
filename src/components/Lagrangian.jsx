import React, {useEffect, useState, useRef} from "react";
import {StyledCanvas, loadRuntime} from "../components/Canvas";




const createTexture = ({ctx, filter=null, data, width=null, height=null}) => {
    /*
    
    */
    let texture = ctx.createTexture();
    if (!filter) {
        filter = ctx.NEAREST;
    }
    const textureType = ctx.TEXTURE_2D;
    const args = data instanceof Uint8Array ? [width, height, 0] : [];

    ctx.bindTexture(textureType, texture);

    try {
        ctx.texImage2D(textureType, 0, ctx.RGBA, ...args, ctx.RGBA, ctx.UNSIGNED_BYTE, data);
    } catch (err) {
        console.log(err);
    }
    
    [
        [ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE],
        [ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE],
        [ctx.TEXTURE_MIN_FILTER, filter],
        [ctx.TEXTURE_MAG_FILTER, filter]
    ].forEach(
        ([a, b]) => {ctx.texParameteri(textureType, a, b)}
    );
    ctx.bindTexture(textureType, null);  // prevent accidental use
    return texture;
};


class ArrayBuffer {
    constructor(ctx, data) {
        this.buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
    }
}


const rgba = (x, z, fade) => {
    const color = x > 0.0 ? "255, 0, 0" : "0, 0, 255";
    const alpha = 1.0 - fade * z;
    return "rgba("+color+", "+alpha+")";
};



const getColorRamp = (colors) => {
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



export default ({
    res=Math.ceil(Math.sqrt(1000)), 
    metadataFile="/wind.json", 
    source="/wind.png", 
    colors={
        0.0: '#dd7700',
        1.0: '#660066'
    },
    opacity=0.996, // how fast the particle trails fade on each frame
    speed=0.25, // how fast the particles move
    drop=0.003, // how often the particles move to a random place
    bump=0.01, // drop rate increase relative to individual particle speed 
}) => {

    

    const positions = [0, 0, res, res];


    const [assets, setAssets] = useState(null);

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [programs, setPrograms] = useState(null);
    const [particles, setParticles] = useState(null);
    const [metadata, setMetadata] = useState(null);


    const shaders = {
        draw: ["draw-vertex", "draw-fragment"],
        screen: ["quad-vertex", "screen-fragment"],
        update: ["quad-vertex", "update-fragment"],
        triangle: ["triangle-vertex", "triangle-fragment"],
    };


    
    useEffect(() => {
        /*
        Create a random distribution of particle positions encoded as 4-byte colors.

        This is the default behavior, but it is broken out as a effect so that additional logic
        can be applied, or initial positions can be loaded from a database or static file.
        
        */
        const count = res * res;
        setParticles(new Uint8Array(Array.from({length: count*4}, () => Math.floor(Math.random() * 256))));
        console.log(`Generated ${count} particle positions.`);
    }, []);

    useEffect(() => {
        (async () => {
            setMetadata(await fetch(metadataFile).then(r => r.json()));
            console.log(`Loaded metadata from ${metadataFile}`);
        })() 
    }, []);

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
        /*
        Generate assets and handles for rendering once the canvas has loaded.
        */

        if (!ref.current) return;

        const ctx = ref.current.getContext("webgl");
        const {width, height} = ref.current;
        const shape = {width, height};
    
        // use transducer to replace configs with texture instances
        const textures = Object.fromEntries(Object.entries({
            screen: {data: new Uint8Array(width * height * 4), ...shape},
            back: {data: new Uint8Array(width * height * 4), ...shape},
            state: {data: particles, width: res, height: res},
            previous: {data: particles, width: res, height: res},
            color: {filter: ctx.LINEAR, data: getColorRamp(colors), width: 16, height: 16},
        }).map(([k, v]) => [k, createTexture({ctx, ...v})]));

        const img = new Image();
        img.src = source;
        
        img.onload = () => {
            console.log(`Loaded image data: ${source}`);  // TODO: remove print
            textures.uv = createTexture({ctx, filter: ctx.LINEAR, data: img});
        };

        const buffers = {
            quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
            index: new ArrayBuffer(ctx, particles)
        };

        setAssets({
            textures,
            buffers,
            frameBuffer: ctx.createFramebuffer()
        });

    }, [ref]);


    useEffect(()=>{
        /*
        IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
        shaders as programs.
        */
    
        if (!shaders || !runtime || !ref.current) return;
        console.log("loading shaders...");

        (async () => {

            const canvas = ref.current;
            const ctx = canvas.getContext("webgl");
        
            let shaderSource = {};
            let compiled = {};
            
            Object.entries(shaders).forEach(async (programName, pair) => {
                
                let [vs, fs] = pair.map(async (file)=>{
                    if (!(file in shaderSource)) {
                        shaderSource[file] = await runtime.fetch_text(`/${file}.glsl`)
                    }
                    return shaderSource[file];
                });
                const program = runtime.create_program(ctx, await vs, await fs);
                let wrapper = {program};
                for (let ii = 0; ii < ctx.getProgramParameter(program, ctx.ACTIVE_ATTRIBUTES); ii++) {
                    const {name} = ctx.getActiveAttrib(program, ii);
                    wrapper[name] = ctx.getAttribLocation(program, name);
                }
                for (let ii = 0; ii < ctx.getProgramParameter(program, ctx.ACTIVE_UNIFORMS); ii++) {
                    const {name} = ctx.getActiveUniform(program, ii);
                    wrapper[name] = ctx.getUniformLocation(program, name);
                }
                compiled[programName] = wrapper;
            });

            setPrograms(compiled);

        })()
    },[runtime]);


    useEffect(()=>{

        const canvas = ref.current;
        if (!programs || !canvas) return;

        const {width, height} = canvas;
        const {screen, draw, update} = programs;
        const ctx = canvas.getContext("webgl");
    
        const world = [0, 0, width, height];
        const {
            textures: {uv, state, back, color, previous, ...textures},
            buffers: {quad, index},
            framebuffer
        } = assets;
        

        const steps = [
            {
                program: screen,
                components: {
                    tex: [
                        [uv, 0],
                        [state, 1],
                        [back, 2]
                    ],
                    attrib: [
                        [quad.buffer, "a_pos", 2]
                    ],
                    uniforms: [
                        ["i", "u_screen", 2],
                        ["f", "u_opacity", opacity]
                    ],
                    framebuffer: [framebuffer, textures.screen]
                },
                draw_as: [ctx.TRIANGLES, 6],
                viewport: world
            },
            {
                program: draw,
                components: {
                    tex: [
                        [color, 2],
                    ],
                    attrib: [
                        [index.buffer, "a_index", 1]
                    ],
                    uniforms: [
                        ["i", "u_wind", 0],
                        ["i", "u_particles", 1],
                        ["i", "u_color_ramp", 2],
                        ["f", "u_particles_res", res],
                        ["f", "u_wind_max", [metadata.u.max, metadata.v.max]],
                        ["f", "u_wind_min", [metadata.u.min, metadata.v.min]]
                    ],
                    framebuffer: [framebuffer, textures.screen]
                },
                draw_as: [ctx.POINTS, res * res],
                viewport: world
            },
            {
                program: screen,
                components: {
                    tex: [
                        [textures.screen, 2],
                    ],
                    uniforms: [
                        ["i", "u_color_ramp", 2],
                        ["f", "u_opacity", 1.0],
                    ],

                    attrib: [
                        [quad.buffer, "a_pos", 2]
                    ],
                    framebuffer: [null, null]
                },
                draw_as: [ctx.TRIANGLES, 6],
                viewport: world,
                callback: () => [back, textures.screen] = [textures.screen, back]  // ! blend alternate frames
            },
            {
                program: update,
                components: {
                    tex: [
                        [textures.color, 2],
                    ],
                    uniforms: [
                        ["i", "u_wind", 0],
                        ["i", "u_particles", 1],
                        ["i", "u_color_ramp", 2],
                        ["f", "speed", speed],
                        ["f", "drop", drop],
                        ["f", "bump", bump],
                        ["f", "seed", Math.random()],
                        ["f", "u_wind_res", [width, height]],
                        ["f", "u_wind_max", [metadata.u.max, metadata.v.max]],
                        ["f", "u_wind_min", [metadata.u.min, metadata.v.min]]

                    ],
                    attrib: [
                        [quad.buffer, "a_pos", 2]
                    ],
                    framebuffer: [framebuffer, textures.previous]
                },
                draw_as: [ctx.TRIANGLES, 6],
                viewport: positions,
                callback: () => [state, previous] = [previous, state] // use previous pass to calculate next position
            }
        ]
        
        
        steps.forEach(({components, program, draw_as, viewport, callback=null}) => {

            const { tex, attrib, uniforms, framebuffer } = components;
            const [handle, fb_tex] = framebuffer;
            const [type, count] = draw_as;

            ctx.viewport(...viewport);
            ctx.bindFramebuffer(ctx.FRAMEBUFFER, handle);
            if (fb_tex) {
                ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, fb_tex, 0);
            }

            ctx.useProgram(program.program);
            tex.forEach(([tex, slot]) => bind_texture(ctx, tex, slot));
            attrib.forEach(([buffer, handle, numComponents]) => {
                ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
                ctx.enableVertexAttribArray(handle);
                ctx.vertexAttribPointer(handle, numComponents, ctx.FLOAT, false, 0, 0);
            });
            uniforms.forEach(([T, k, v]) => {
                const L = v.length || 1;
                if (L === 1) {
                    ctx[`uniform${L}${T}`](program[k], v);
                } else {
                    ctx[`uniform${L}${T}`](program[k], ...v);
                }
            });
            ctx.drawArrays(type, 0, count);
            if (callback) {
                callback();
            }
       
        });
    }, [programs]);
   

    return <StyledCanvas ref={ref} />
};