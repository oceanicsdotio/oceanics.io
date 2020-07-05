import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const StyledCanvas = styled.canvas`
    border: 1px solid #CCCCCC;
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({context="2d", key, shaders, caption, dataType, font="12px Arial"}) => {

    const ref = useRef(null);
    const [run, setRun] = useState(false);
    const [runtime, setRuntime] = useState(null);
    const [cursor, setCursor] = useState([0.0, 0.0]);

    const DataStructures = {

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
        
        RectilinearGrid: (ctx, width, height) => {
            /*
            Rectiinear grid
            */
            const struct = new runtime.RectilinearGrid(10, 10);
            return ({frames, time}) => {
                struct.animation_frame(ctx, width, height, frames, time, "#FF00FF");
            }
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
    
        TriangularMesh: (ctx, width, height) => {
            /*
            Triangular Mesh
            */
            const struct = new runtime.TriangularMesh(10, 10, width, height);
            return ({frames, time}) => {
                struct.animation_frame(ctx, parseInt(width), parseInt(height), frames, time, "#FF00FF");
            }
        }
    };
    
    useEffect(()=>{
        /*
        Import the WebAssembly module and set the runtime of the Component.
        */
        (async () => {
            const wasm = await import('../wasm');
            setRuntime(wasm);
        })()
    },[]);

    useEffect(()=>{
        /*
        Fetch the GLSL code and compile the shaders as programs.
        */
        (async () => {
            if (context !== "webgl" || !shaders || !runtime) return;
            const shaderSource = [...new Set(shaders.flat())].map(runtime.fetch_text(`/${key}.glsl`));
            const source = await Promise.all(shaderSource);
            
            // const compiled = shaders.reduce(pair => {
            //     let [vs, fs] = shaders[key];
            //     const program = wasm.create_program(ctx, source[vs], source[fs]);
            //     let wrapper = {program};
            //     for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_ATTRIBUTES); i++) {
            //         const {name} = ctx.getActiveAttrib(program, i);
            //         wrapper[name] = ctx.getAttribLocation(program, name);
            //     }
            //     for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_UNIFORMS); i++) {
            //         const {name} = ctx.getActiveUniform(program, i);
            //         wrapper[name] = ctx.getUniformLocation(program, name);
            //     }
            //     obj[key] = wrapper;
            //     return obj;
            // }, {});
        })()
    },[]);

    useEffect(() => {
        if (!runtime) return;
        let canvas = ref.current;
        const {left, top} = canvas.getBoundingClientRect();
        canvas.addEventListener('mousemove', async ({clientX, clientY}) => {
            setCursor([clientX-left, clientY-top]);
        });
    }, []);

    useEffect(() => {
        
        if (!run || !runtime) return;

        let requestId;
        let canvas = ref.current;
        
        const width = getComputedStyle(canvas).getPropertyValue('width').slice(0, -2);
        const height = getComputedStyle(canvas).getPropertyValue('height').slice(0, -2);
        
        canvas.width = width;
        canvas.height = height;

        const start = performance.now();
        const ctx = canvas.getContext(context);
        const draw = DataStructures[dataType](ctx, width, height);

        let frames = 0;
        (function render(){ 
            const time = performance.now() - start;
            draw({frames, time});
            frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
            if (caption) runtime.draw_caption(ctx, caption, 0.0, height, "#77CCFF", font);
            requestId = requestAnimationFrame(render);
        })()

        return () => {
            cancelAnimationFrame(requestId);
        }
    }, [run]);

    return <StyledCanvas
        onClick={()=>{setRun(!run)}}
        id={key}
        ref={ref} />;
};