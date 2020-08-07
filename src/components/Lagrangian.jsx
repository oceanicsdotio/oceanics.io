import React, {useEffect, useState, useRef} from "react";
import {StyledCanvas, loadRuntime} from "../components/Canvas";



const createTexture = (gl, filter, data, width=null, height=null) => {
    let texture = gl.createTexture();
    const textureType = gl.TEXTURE_2D;
    const args = data instanceof Uint8Array ? [width, height, 0] : [];

    gl.bindTexture(textureType, texture);
    gl.texImage2D(textureType, 0, gl.RGBA, ...args, gl.RGBA, gl.UNSIGNED_BYTE, data);
    [
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_MIN_FILTER, filter],
        [gl.TEXTURE_MAG_FILTER, filter]
    ].forEach(
        ([a, b]) => {gl.texParameteri(textureType, a, b)}
    );
    gl.bindTexture(textureType, null);  // prevent accidental use
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


const loadTileImage = (url, canvas) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener('load', function() {
        let can = document.getElementById(canvas);
        let ctx = can.getContext('2d');
        ctx.drawImage(img, 0, 0, can.width, can.height);
    }, false);
    img.src = url;
};

class ParticleSystem {
    constructor(res) {
        this.state = new Uint8Array(res * res * 4);
        this.indices = [];
        for (let ii = 0; ii < this.state.length; ii++) {
            if (ii % 4 === 0) this.indices.push(ii);
            this.state[ii] = Math.floor(Math.random() * 256);
        }
    }
}

const bindAndDrawArrays = (ctx, program, components, draw_as, viewport, callback = null) => {

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

const shaders = [
    ["quad-vertex", "screen-fragment"],
    ["draw-vertex", "draw-fragment"]
]

export default ({res=32, programs, metadataFile, source, colors}) => {

    // const metadata = await fetch(metadataFile).then(r => r.json());
    // console.log(metadata);

    const [assets, setAssets] = useState(null);

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [programs, setPrograms] = useState(null);

    const particles = new ParticleSystem(res);


    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(()=>{

        if (!ref.current) return;

        const ctx = ref.current.getContext("webgl");
        const {width, height} = ref.current;

        const textures = Object.fromEntries(Object.entries({
            screen: [ctx.NEAREST, new Uint8Array(width * height * 4), width, height],
            back: [ctx.NEAREST, new Uint8Array(width * height * 4), width, height],
            state: [ctx.NEAREST, particles.state, res, res],
            previous: [ctx.NEAREST, particles.state, res, res],
            color: [ctx.LINEAR, getColorRamp(colors), 16, 16],
        }).map(([k, v]) => [k, createTexture(ctx, ...v)]));

        const img = new Image();
        img.src = source;
        
        img.onload = () => {
            console.log(`Loaded image data: ${source}`);  // TODO: remove print
            textures.uv = createTexture(ctx, ctx.LINEAR, img);
        };

        const buffers = {
            quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
            index: new ArrayBuffer(ctx, particles.state)
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
            
            shaders.forEach(async (pair) => {
                
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
                compiled[[...pair]] = wrapper;
            });

        })()
    },[runtime]);

    const exec = () => {

        const world = [0, 0, width, height];
        const positions = [0, 0, res, res];

        const steps = [
            {
                program: programs.screen,
                components: {
                    tex: [
                        [textures.uv, 0],
                        [textures.state, 1],
                        [textures.back, 2]
                    ],
                    attrib: [
                        [buffers.quad.buffer, "a_pos", 2]
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
                program: programs.draw,
                components: {
                    tex: [
                        [textures.color, 2],
                    ],
                    attrib: [
                        [buffers.index.buffer, "a_index", 1]
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
                program: programs.screen,
                components: {
                    tex: [
                        [textures.screen, 2],
                    ],
                    uniforms: [
                        ["i", "u_color_ramp", 2],
                        ["f", "u_opacity", 1.0],
                    ],

                    attrib: [
                        [buffers.quad.buffer, "a_pos", 2]
                    ],
                    framebuffer: [null, null]
                },
                draw_as: [ctx.TRIANGLES, 6],
                viewport: world,
                callback: () => [textures.back, textures.screen] = [textures.screen, textures.back]  // ! blend alternate frames
            },
            {
                program: programs.update,
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
                        [buffers.quad.buffer, "a_pos", 2]
                    ],
                    framebuffer: [framebuffer, textures.previous]
                },
                draw_as: [ctx.TRIANGLES, 6],
                viewport: positions,
                callback: () => [textures.state, textures.previous] = [textures.previous, textures.state] // ! use previous pass to calculate next position
            }
        ];

        steps.forEach(({components, program, draw_as, viewport, callback}) => {
            bindAndDrawArrays(ctx, program, components, draw_as, viewport, callback);
        });
    }

    return <StyledCanvas ref={ref} />
};