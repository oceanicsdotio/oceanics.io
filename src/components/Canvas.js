import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const StyledCanvas = styled.canvas`
    border: 1px solid #CCCCCC;
    position: relative;
    width: 100%;
    height: 400px;
`;


const magnitude = (vec) => {
    return Math.sqrt(
        vec.map(x => x*x).reduce((a, b) => a+b, 0.0)
    )
};

const uniform = (a, b) => {
    return Math.random() * (b - a) + a;
};

export default ({context="2d", key, shaders, caption, dataType, font="12px Arial"}) => {

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [cursor, setCursor] = useState([0.0, 0.0]);

    const DataStructures = {

        Particles: (ctx, width, height) => {

            const count = 24;
            const dim = "xyz;"
            const padding = 0.0;
            const shape = [width, height, 200];
           
            let particles = [];
            for (let ii=0; ii<count; ii++) {
                particles.push({
                    heading: [1.0, 0.0, 0.0],
                    coordinates: "xyz".split('').map(
                        d => dim.includes(d) ? uniform(padding, 1.0 - padding) : 0.5
                    ),
                    velocity: [0.0, 0.0, 0.0],
                    links: {}
                })
            }
        
            particles.forEach((p, ii) => {
                for (let jj=ii+1; jj<count; jj++) {
                    p.links[jj] = {
                        vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                        spring: new runtime.Spring(0.002, 0.0, 0.0, 0.25, 0.1, 1 / Math.log(count))
                    };
                }
            });
            
        
            let struct = {
                fade: 0.0,
                count,
                zero: 0.0, // performance.now(),
                cursor: [0, 0, 0],
                padding,
                streamline: true,
                radius: 16,
                torque: 3.0,
                bounce: 0.2,
                depth: Math.min(width, height),
                control: 0.0,
                color: "#ff00ff",
                delta: {
                    x: 0,
                    y: 0,
                    drag: 0.0,
                    t: 0.0
                }
            };
        
            return () => {

                ctx.lineWidth = 1;
                ctx.strokeStyle = "#FFFFFF";

                runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000077`);
                const {radius, fade, bounce, padding, cursor} = struct;
              
                particles = particles.map((props) => {
                
                    let {velocity, coordinates, heading, links} = props;
                    const speed = magnitude(velocity);
                    const torque = cursor.map(item => item * struct.torque * (0.5 - coordinates[2]));
                    
                    runtime.Agent.draw_agent(
                        ctx,
                        particles.length,
                        ...shape.slice(0, 2),
                        ...coordinates,
                        ...heading.slice(0, 2),
                        fade,
                        Math.max((shape[2] - coordinates[2])/shape[2] + 0.5, 0.0) * radius,
                        "#FFFFFF"
                    );
            
                    if (links) {
                        links = Object.entries(links).map((link, jj)=>{
                            const neighbor = particles[jj];
                            const {spring, vec} = link;

                    
                            if (spring && vec) {
                                const scale = spring.size(scale);
                                if (spring.drop()) return;
                                const dist = magnitude(vec);
                                spring.update(dist);
                                const force = spring.force();
                                let scaled = [];
                                let newLink = {
                                    ...link,
                                    vec: vec.map((k, index) => {
                                        const delta = k / dist * force / struct.particles.length;
                                        velocity[index] += delta;
                                        neighbor.velocity[index] -= delta;
                                        const val = coordinates[index] - neighbor.coordinates[index];
                                        scaled.push(val * scale);
                                        return val;
                                    }),
                                    spring,
                                };
                                const start = coordinates.map((v, k) => v * shape[k] - scaled[k]);
                                const end = neighbor.coordinates.map((v, k) => v * shape[k] + scaled[k]);
                                try {
                                    const grad = ctx.createLinearGradient(
                                        ...start.slice(0, 2),
                                        ...end.slice(0, 2)
                                    );
                                    grad.addColorStop(0, rgba(force, coordinates[2], fade));
                                    grad.addColorStop(1, rgba(force, end[2], fade));
                                    ctx.strokeStyle = grad;
                                } catch (e) {
                                    ctx.strokeStyle = "#FFFFFF";
                                } finally {
                                    ctx.globalAlpha = 1.0 / Math.log2(particles.length);
                                    ctx.beginPath();
                                    ctx.moveTo(...start.slice(0, 2));
                                    ctx.lineTo(...end.slice(0, 2));
                                    ctx.stroke();
                                } 
                            }
   
                        });   
                    }
                    
                    return ({
                        coordinates: coordinates.map((X, kk) => {
                            velocity[kk] += torque[kk];
                            X += velocity[kk];
                            if (X > 1.0 - padding) {
                                X -= 2*(X - 1.0 - padding);
                                velocity[kk] *= -bounce;
                            } else if (X < padding) {
                                X -= 2*(X - padding);
                                velocity[kk] *= -bounce;
                            }
                            heading[kk] = speed > 0.00001 ? velocity[kk] / speed : heading[kk];
                            return X
                        }),
                        heading, 
                        velocity,
                        links,
                    });
                });
            }
        },

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
        try {
            (async () => {
                const wasm = await import('../wasm');
                setRuntime(wasm);
            })()
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    },[]);

    useEffect(()=>{
        /*
        Fetch the GLSL code and compile the shaders as programs.
        */
        (async () => {
            if (context !== "webgl" || !shaders || !runtime) return;
            const shaderSource = [...new Set(shaders.flat())].map(runtime.fetch_text(`/${key}.glsl`));
            const source = await Promise.all(shaderSource);
            
            if (runtime) {
                const compiled = shaders.reduce(pair => {
                    let [vs, fs] = shaders[key];
                    const program = runtime.create_program(ctx, source[vs], source[fs]);
                    let wrapper = {program};
                    for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_ATTRIBUTES); i++) {
                        const {name} = ctx.getActiveAttrib(program, i);
                        wrapper[name] = ctx.getAttribLocation(program, name);
                    }
                    for (let i = 0; i < ctx.getProgramParameter(program, ctx.ACTIVE_UNIFORMS); i++) {
                        const {name} = ctx.getActiveUniform(program, i);
                        wrapper[name] = ctx.getUniformLocation(program, name);
                    }
                    obj[key] = wrapper;
                    return obj;
                }, {});
            }
            
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
        
        if (!runtime) return;

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

        return () => cancelAnimationFrame(requestId);
    
    });

    return <StyledCanvas
        id={key}
        ref={ref} />;
};