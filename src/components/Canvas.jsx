import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    border: 1px solid #CCCCCC;
    position: relative;
    width: 100%;
    height: 400px;
`;

export const loadRuntime = (setter) => {
    /*
    Import the WebAssembly module and set the runtime of the Component.
    */
    return () => {
        try {
            (async () => setter(await import('../wasm')))()
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    }
};


export const targetHtmlCanvas = (ref, context) => {

    [ref.current.width, ref.current.height] = ["width", "height"].map(
        dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
    );

    return {
        start: performance.now(),
        ctx: ref.current.getContext(context),
        shape: [ref.current.width, ref.current.height],
        requestId: null,
        frames: 0
    }
};

export const animationLoop = (runtime, ref, context, drawGenerator, caption, font="12px Arial") => () => {
    /*
    If the WASM runtime has been loaded, get the size of the displayed canvas
    and draw the data structure that has been passed as a prop. 
    */

    if (!(runtime && ref.current)) return;

    let {
        start,
        ctx,
        shape,
        requestId, 
        frames
    } = targetHtmlCanvas(ref, context);

    const draw = drawGenerator(ctx, ...shape);

    (function render() {
        const time = performance.now() - start;
        draw({ frames, time });
        frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
        if (caption) runtime.draw_caption(ctx, caption, 0.0, shape[1], "#77CCFF", font);
        requestId = requestAnimationFrame(render);
    })()

    return () => cancelAnimationFrame(requestId);
};

export default ({context="2d", key, shaders, caption, dataType, font="12px Arial"}) => {

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [cursor, setCursor] = useState([0.0, 0.0]);

    const DataStructures = {
        /*
        Data structures table built inside component to use the runtime related effects. 

        Used for simple deterministic effects.
        */
        HexagonalGrid: (ctx, width, height) => {
            return () => runtime.draw_hex_grid(ctx, width, height, ...cursor, "#FF00FF");
        },

        Cursor: (ctx, width, height) => {
            /*
            Draw an animated reticule cursor using Rust/WebAssembly.
            */
            let state = {
                x: null,
                y: null,
                dx: 0.0,
                dy: 0.0,
                drag: false,
            };
         
            return ({time}) => {
                runtime.Cursor.draw(ctx, width, height, time, state.x, state.y, state.dx, state.dy, "#FF00FFCC");
                Object.assign(state, {
                    dx: state.dx + 0.1*(state.x - state.dx),
                    dy: state.dy + 0.1*(state.y - state.dy)
                });
            };
        },
        
        DataStream: (ctx, width, height) => {
            /*
            DataStream animation
            */
            const struct = new runtime.DataStream(500);
            return ({time}) => {
                struct.push(time, Math.random());
                struct.draw(ctx, width, height, "#FFFFFF");
            }
        },
    };
    
    useEffect(loadRuntime(setRuntime),[]);

    useEffect(()=>{
        /*
        IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
        shaders as programs.
        */
    
        if (context !== "webgl" || !shaders || !runtime || !ref.current) return;
        console.log("loading shaders...");

        (async () => {

            const canvas = ref.current;
            const ctx = canvas.getContext(context);
        
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

    useEffect(() => {
        /*
        If the WASM runtime has been loaded, get the canvas reference and add a mouse event
        listener to update the cursor position for interacting with objects within the 
        canvas rendering context.
        */
        if (!runtime) return;

        let canvas = ref.current;
        const {left, top} = canvas.getBoundingClientRect();
        canvas.addEventListener('mousemove', async ({clientX, clientY}) => {
            setCursor([clientX-left, clientY-top]);
        });
    }, []);

    

    useEffect(dataType ? animationLoop(runtime, ref, context, DataStructures[dataType], dataType) : ()=>{});

    return <StyledCanvas
        id={key}
        ref={ref} />;
};