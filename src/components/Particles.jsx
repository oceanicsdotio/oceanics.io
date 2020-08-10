import React, { useState, useEffect, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import styled from "styled-components";

const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

const magnitude = (vec) => {
    return Math.sqrt(
        vec.map(x => x * x).reduce((a, b) => a + b, 0.0)
    )
};


const rgba = (x, z, fade) => {
    const color = x > 0.0 ? "255, 0, 0" : "0, 0, 255";
    const alpha = 1.0 - fade * z;
    return "rgba("+color+", "+alpha+")";
};


const uniform = (a, b) => {
    return Math.random() * (b - a) + a;
};

export default ({ 
    count=27, 
    key, 
    font = "24px Arial", 
    dim="xyz", 
    config = {
        fade: 0.5,
        zero: 0.0,
        cursor: [0, 0, 0],
        padding: 0.0,
        radius: 10,
        drag: 0.001,
        torque: 3.0,
        bounce: 0.2,
        delta: {
            x: 0,
            y: 0,
            drag: 0.0,
            t: 0.0
    }
}) => {

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [particleSystem, setParticleSystem] = useState(null);

    const 
    };

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
        /*
        Create particle system and initialize the spring forces between them
        */

        if (!runtime) return;
        const {padding} = config;

        let particles = [];
        for (let ii = 0; ii < count; ii++) {
            particles.push({
                heading: [1.0, 0.0, 0.0],
                coordinates: "xyz".split('').map(
                    d => dim.includes(d) ? uniform(padding, 1.0 - padding) : 0.5
                ),
                velocity: [0.0, 0.0, 0.0],
                links: {}
            })
        }

        // spring constant, displacement, velocity, zero length, stop, probability
        particles.forEach((p, ii) => {
            for (let jj = ii + 1; jj < count; jj++) {
                p.links[jj] = {
                    vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                    spring: new runtime.Spring(0.002, 0.0, 0.0, 0.2, 0.4, 1 / Math.log(count))
                };
            }
        });
        setParticleSystem(particles);
    
    }, [runtime]);


    useEffect(() => {
        /*
        If the WASM runtime has been loaded, get the size of the displayed canvas
        and draw the data structure that has been passed as a prop. 
        */

        if (!runtime || !particleSystem) return;

        let requestId;
        let canvas = ref.current;

        const sleep = (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        const width = getComputedStyle(canvas).getPropertyValue('width').slice(0, -2);
        const height = getComputedStyle(canvas).getPropertyValue('height').slice(0, -2);
        const start = performance.now();
        const ctx = canvas.getContext("2d");
        
        const shape = [width, height, 200];

        canvas.width = width;
        canvas.height = height;

        let frames = 0;
        let positions = particleSystem;

    
        (function render() {
            const time = performance.now() - start;
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#FFFFFF";

            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000066`);
            const { radius, fade, bounce, padding, cursor, drag } = config;

            // Draw each particle position, with a heading indicator.
            positions.forEach(({coordinates, heading}) => {
                runtime.Agent.draw_agent(
                    ctx,
                    particleSystem.length,
                    ...shape.slice(0, 2),
                    ...coordinates,
                    ...heading.slice(0, 2),
                    fade,
                    Math.max((shape[2] - coordinates[2]) / shape[2] + 0.5, 0.0) * radius,
                    "#FFFFFF"
                );
            });

            positions.forEach(({ velocity, coordinates, heading, links }, ii) => {

                const speed = magnitude(velocity);
                const torque = cursor.map(item => item * config.torque * (0.5 - coordinates[2]));
               
                const newLinks = Object.fromEntries(Object.entries(links).map(([jj, link]) => {
                    
                    if (!link || !link.spring || !link.vec) return [jj, link];

                    const {spring, vec} = link;
                    const newVec = coordinates.map((dim, index) => dim - positions[jj].coordinates[index]);
                    const dist = magnitude(newVec);
                    spring.update(dist);

                    // if ( spring.drop()) {
                    //     return [jj, {
                    //         vec: newVec,
                    //         spring: spring,
                    //     }];
                    // };
                    
                    const force = spring.force();
                    const scale = spring.size(1.0);

                    if (isNaN(dist) || isNaN(force)) {
                        console.log([positions[jj], jj, coordinates, positions[ii]]);
                        throw Error(`Bad value for dist=${dist}, vec=${newVec}`);
                    }

                    const scaled = [];
                    const newLink = {
                        vec: vec.map((k, index) => {
                            const delta = dist ? k / dist * force : 0.0;
                            velocity[index] += delta;
                            positions[jj].velocity[index] -= delta;
                            const val = coordinates[index] - positions[jj].coordinates[index];
                            scaled.push(val * scale);
                            return val;
                        }),
                        spring: spring,
                    };
                    
                    const start = coordinates.map((v, k) => v * shape[k] - scaled[k]);
                    const end = positions[jj].coordinates.map((v, k) => v * shape[k] + scaled[k]);
                    
                    try {
                        const grad = ctx.createLinearGradient(
                            ...start.slice(0, 2),
                            ...end.slice(0, 2)
                        );
                        grad.addColorStop(0, rgba(force, coordinates[2], fade));
                        grad.addColorStop(1, rgba(force, end[2], fade));
                        ctx.strokeStyle = grad;
                    } catch (e) {
                        ctx.strokeStyle = "#FFFFFFFF";
                    } 
                    ctx.globalAlpha = 0.75;
                    ctx.beginPath();
                    ctx.moveTo(...start.slice(0, 2));
                    ctx.lineTo(...end.slice(0, 2));
                    ctx.stroke();
  
                    return [jj, newLink];
                }));
                

                positions[ii] = {
                    coordinates: coordinates.map((X, kk) => {
                        velocity[kk] += torque[kk];
                        velocity[kk] *= (1.0 - drag);
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
                    heading: heading, 
                    velocity: velocity,
                    links: newLinks,
                };
    
            });

            // Draw overlay
            frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
            runtime.draw_caption(ctx, `Particles: ${count}`, 0.0, height, "#77CCFF", font);
            sleep(5000);
            
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);

    return <StyledCanvas id={key} ref={ref} />;
};