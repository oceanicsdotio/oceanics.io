import React, { useState, useEffect } from "react";
import styled from "styled-components";


const GLSL_DIRECTORY = "../../glsl-src";

const StyledCanvas = styled.canvas`
    border-radius: 3px;
    border: 1px solid #FF00FF;
    position: relative;
    width: 100%;
`;

export default (props) => {

    const canvasRef = React.useRef(null)
    
    const renderProps = {
        eid: "data-stream", 
        context: "2d", 
        caption: "DataStream", 
        font: "12px Arial",
        canvas: {
            height: 200,
            width: 200
        }
    }

    useEffect(() => {

        async function run () {
            props = renderProps;
            const wasm = await import('../utils/space');
            console.log(wasm);

            if (!props.canvas) throw Error(`No canvas element "${props.eid}".`);

            const ctx = props.ctx = canvasRef.current.getContext(props.context);
            if (!ctx) throw Error(`No "${props.context}" rendering context for ${props.eid}.`);

            if (props.context === "webgl" && typeof props.shaders == "undefined") {
                throw Error(`Shaders required to start "${props.context}" rendering context.`);
            } else if (props.context === "webgl") {
                let source = null;
                try {
                    source = Object.fromEntries(await Promise.all([...new Set(Object.values(props.shaders).flat())]
                        .map(async key => [key, await wasm.fetch_text(`${GLSL_DIRECTORY}/${key}.glsl`)])));
                } catch (e) {
                    throw Error(`Could not load shaders from ./${GLSL_DIRECTORY}`);
                }

                props.programs = Object.keys(props.shaders).reduce((obj, key) => {
                    let [vs, fs] = props.shaders[key];
                    const program = wasm.create_program(ctx, source[vs], source[fs]);
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

            let {canvas, caption, font} = props;
            let {height} = canvas;
            let frames = 0;
            let stream = new wasm.DataStream(200);
        
            const _render = () => {
                const time = (performance.now() | 0.0 )- props.start;
                stream.push(time, Math.random());
                stream.draw(ctx, 200.0, 200.0, "#FFFFFF");
                frames = wasm.draw_fps(ctx, frames, time, "#FFFFFF");
                wasm.draw_caption(ctx, caption, 0.0, height, "#CCCCCC", font);
                requestAnimationFrame(_render);
            };
            _render();
            
            
        }
        run();
     }, [])

    return (
    
        <StyledCanvas 
            id={renderProps.eid}
            ref={canvasRef}
            height={200}
            width={200}
        />
    );
};