const GLSL_DIRECTORY = "glsl";

import {create_program, bind_texture, fetch_text, mouse_move} from './space.js'


export const RenderingContext = async (f, props) => {

    if (!props.canvas) throw Error(`No canvas element "${props.eid}".`);

    const ctx = props.ctx = props.canvas.getContext(props.context);
    if (!ctx) throw Error(`No "${props.context}" rendering context for ${props.eid}.`);

    if (props.context === "webgl" && typeof props.shaders == "undefined") {
        throw Error(`Shaders required to start "${props.context}" rendering context.`);
    } else if (props.context === "webgl") {
        let source = null;
        try {
            source = Object.fromEntries(await Promise.all([...new Set(Object.values(props.shaders).flat())]
                .map(async key => [key, await fetch_text(`${GLSL_DIRECTORY}/${key}.glsl`)])));
        } catch (e) {
            throw Error(`Could not load shaders from ./${GLSL_DIRECTORY}`);
        }

        props.programs = Object.keys(props.shaders).reduce((obj, key) => {
            let [vs, fs] = props.shaders[key];
            const program = create_program(ctx, source[vs], source[fs]);
            let wrapper = {program: program};
            for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_ATTRIBUTES); i++) {
                let attribute = ctx.getActiveAttrib(program, i);
                wrapper[attribute.name] = ctx.getAttribLocation(program, attribute.name);
            }
            for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_UNIFORMS); i++) {
                let uniform = ctx.getActiveUniform(program, i);
                wrapper[uniform.name] = ctx.getUniformLocation(program, uniform.name);
            }
            obj[key] = wrapper;
            return obj;
        }, {});
    }

    props.start = performance.now() | 0.0;
    f(props);
};

export const createTexture = (gl, filter, data, width=null, height=null) => {
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


export const magnitude = (vec) => {
    return Math.sqrt(
        vec.map(x => x*x).reduce((a, b) => a+b, 0.0)
    )
};

export const uniform = (a, b) => {
    return Math.random() * (b - a) + a;
};


export const rgba = (x, z, fade) => {
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


class ArrayBuffer {
    constructor(ctx, data) {
        this.buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
    }
}


export const LagrangianParticles = async (props) => {

    const {canvas, ctx, res, programs, metadataFile} = props;
    const {width, height} = canvas;

    // console.log("Here");

    const metadata = await fetch(metadataFile).then(r => r.json());
    console.log(metadata);

    let particles = new ParticleSystem(res);
    const framebuffer = ctx.createFramebuffer();
    const textures = Object.fromEntries(Object.entries({
        screen: [ctx.NEAREST, new Uint8Array(width * height * 4), width, height],
        back: [ctx.NEAREST, new Uint8Array(width * height * 4), width, height],
        state: [ctx.NEAREST, particles.state, res, res],
        previous: [ctx.NEAREST, particles.state, res, res],
        color: [ctx.LINEAR, getColorRamp(props.colors), 16, 16],
    }).map(([k, v]) => {return [k, createTexture(ctx, ...v)]}));

    const buffers = {
        quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
        index: new ArrayBuffer(ctx, particles.state)
    };

    function render() {

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
                        ["f", "u_opacity", props.opacity]
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
                        ["f", "u_particles_res", props.res],
                        ["f", "u_wind_max", [metadata.u.max, metadata.v.max]],
                        ["f", "u_wind_min", [metadata.u.min, metadata.v.min]]
                    ],
                    framebuffer: [framebuffer, textures.screen]
                },
                draw_as: [ctx.POINTS, props.res * props.res],
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
                        ["f", "speed", props.speed],
                        ["f", "drop", props.drop],
                        ["f", "bump", props.bump],
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
        requestAnimationFrame(render);
    }

    const img = new Image();
    img.src = props.source;
    img.onload = () => {
        textures.uv = createTexture(ctx, ctx.LINEAR, img);
        render();
    };
};

