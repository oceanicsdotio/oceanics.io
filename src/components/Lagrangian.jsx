import React, {useEffect, useState, useRef} from "react";
import {StyledCanvas, loadRuntime} from "../components/Canvas";





class ArrayBuffer {
    constructor(ctx, data) {
        this.buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
    }
}




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
    metadataFile, 
    source, 
    colors={
        0.0: '#dd7700',
        1.0: '#660066'
    },
    opacity=0.996, // how fast the particle trails fade on each frame
    speed=0.25, // how fast the particles move
    drop=0.003, // how often the particles move to a random place
    bump=0.01, // drop rate increase relative to individual particle speed 
}) => {
    /*
    Use WebGL to calculate particle trajectories from velocity data. This example uses wind
    data to move particles around the globe. 

    The velocity field is static, but in the future the component will support pulling frames
    from video or gif formats. 
    */

    const positions = [0, 0, res, res];
    const shaders = {
        draw: ["draw-vertex", "draw-fragment"],
        screen: ["quad-vertex", "screen-fragment"],
        update: ["quad-vertex", "update-fragment"],
        triangle: ["triangle-vertex", "triangle-fragment"],
    };

    const ref = useRef(null);
    const preview = useRef(null);

    const [assets, setAssets] = useState(null);
    const [runtime, setRuntime] = useState(null);
    const [programs, setPrograms] = useState(null);
    const [particles, setParticles] = useState(null);
    const [metadata, setMetadata] = useState(null);


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
        /*
        Fetch the metadata file. This has no dependencies and will probably be executed first. 

        In the future this should support loading either static files, or making database queries. 
        */
        (async () => {
            setMetadata(await fetch(metadataFile).then(r => r.json()));
            console.log(`Loaded metadata (${metadataFile}).`);
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

        if (!ref.current || !particles) return;

        const img = new Image();
        img.addEventListener('load', () => {

            const {width, height} = ref.current;
            const ctx = ref.current.getContext("webgl");
            const shape = [width, height];

            const textures = Object.fromEntries(Object.entries({
                screen: {data: new Uint8Array(width * height * 4), shape},
                back: {data: new Uint8Array(width * height * 4), shape},
                state: {data: particles, shape: [res, res]},
                previous: {data: particles, shape: [res, res]},
                color: {filter: ctx.LINEAR, data: getColorRamp(colors), shape: [16, 16]},
                uv: {ctx, filter: ctx.LINEAR, data: img},
            }).map(([k, {filter=ctx.NEAREST, data, shape=[null, null]}]) => {

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
                    ([a, b]) => {ctx.texParameteri(textureType, a, b)}
                );
                ctx.bindTexture(textureType, null);  // prevent accidental use
              
                return [k, texture]
            }));

            setAssets({
                image: img,
                textures,
                buffers: {
                    quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
                    index: new ArrayBuffer(ctx, particles)
                },
                frameBuffer: ctx.createFramebuffer()
            });

            console.log(`Loaded image data (${source}) and created GPU assets.`);
        }, {
            capture: true,
            once: true,
        });
        img.src = source;
        
    }, [ref, particles]);


    useEffect(()=>{
        /*
        IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
        shaders as programs.

        This is executed only once, after the WASM runtime is loaded. 
        */
    
        if (!shaders || !runtime || !ref.current) return;
        
        (async () => {

            const canvas = ref.current;
            const ctx = canvas.getContext("webgl");
            const shaderSource = {};
            const compiled = {};
            
            Object.entries(shaders).forEach(async ([programName, pair]) => {
                
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
            console.log("Compiled shader programs to offload to GPU.");

        })()
    },[runtime]);


    useEffect(()=>{

        const eject = (typeof programs !== 'object' || programs === null || !Object.entries(programs).length );
        
        if (eject) return;
        
        const {width, height} = ref.current;
        const {screen, draw, update} = programs;
        const ctx = ref.current.getContext("webgl");
    
        const world = [0, 0, width, height];
        const {
            textures: {uv, state, back, color, previous, ...textures},
            buffers: {quad, index},
            framebuffer
        } = assets;

        console.log("Programs", programs);

        
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
        
        
        steps.forEach((props) => {
            const {components, program, draw_as, viewport, callback=null} = props;
            const { tex, attrib, uniforms, framebuffer } = components;
            const [handle, fb_tex] = framebuffer;
            const [type, count] = draw_as;

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


    useEffect(() => {
        /*
        Display the wind data in a 2D HTML canvas, for debugging
        and interpretation. 
        */
        if (!preview.current || !assets || !assets.image) return;

        const { width, height } = preview.current;
        let ctx = preview.current.getContext('2d');
        ctx.drawImage(assets.image, 0, 0, width, height);

    }, [preview, assets]);
   

    return (
        <>
            <StyledCanvas ref={ref} />
            <StyledCanvas ref={preview} />
        </>
    )
};