import React, { useState, useEffect, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import styled from "styled-components";


export const StyledCanvas = styled.canvas`
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
    count=24, 
    font="24px Arial", 
    dim="xyz", 
    fade=0.5,
    zero=0.2,
    cursor=[0, 0, 0],
    padding=0.0,
    radius=10,
    drag=0.001,
    torque=3.0,
    bounce=0.2 
}) => {
    /*
    The Particles component creates a Canvas element and data structure representing
    a fully connected network of N particles.

    The default behavior is to be a passive spring system. The properties and rules interact
    and can create complex emergent behaviors depending on their configuration.

    The spring physics are handled by a Rust/WASM library.
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [particleSystem, setParticleSystem] = useState(null);
    const [experimental, setExperimental] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
        /*
        Create particle system and initialize the spring forces between them
        */

        if (!runtime) return;

        const group = new runtime.Group(count);
        console.log("Trying to create Rust Group", group);

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
                    spring: new runtime.Spring(0.002, 0.0, 0.0, zero, 0.4, 1 / Math.log(count))
                };
            }
        });
        setParticleSystem(particles);
        setExperimental(group);
    
    }, [runtime]);


    useEffect(() => {
        /*
        If the WASM runtime has been loaded, get the size of the displayed canvas
        and draw the data structure that has been passed as a prop. 
        */

        if (!runtime || !particleSystem || !experimental) return;

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
        const positions = particleSystem;
        
       
        (function render() {
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#FFFFFF";
            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000066`);

            experimental.draw(
                ctx,
                ...shape.slice(0, 2),
                fade,
                radius,
                "#777777"
            );
         
            // Draw each particle position, with a heading indicator.
            positions.forEach(({coordinates, heading}) => {
                runtime.Agent.draw(
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
                const _torque = cursor.map(item => item * torque * (0.5 - coordinates[2]));
               
                const newLinks = Object.fromEntries(Object.entries(links).map(([jj, link]) => {
                    
                    if (!link || !link.spring || !link.vec) return [jj, link];

                    const {spring, vec} = link;
                    const newVec = coordinates.map((dim, index) => dim - positions[jj].coordinates[index]);
                    const dist = magnitude(newVec);
                    spring.update(dist);

                    if ( count > 64 && spring.drop()) {
                        return [jj, {
                            vec: newVec,
                            spring: spring,
                        }];
                    };
                    
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
                    ctx.moveTo(...start.slice(0, 2).map((val, dim) => val - 4*radius*newLink.vec[dim]));
                    ctx.lineTo(...end.slice(0, 2).map((val, dim) => val + 4*radius*newLink.vec[dim]));
                    ctx.stroke();
  
                    return [jj, newLink];
                }));
                

                positions[ii] = {
                    coordinates: coordinates.map((X, kk) => {
                        velocity[kk] += _torque[kk];
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
            const time = performance.now() - start;
            frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
            runtime.draw_caption(ctx, `N=${count}`, 0.0, height, "#77CCFF", font);
            sleep(5000);
            
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [particleSystem, experimental]);

    return <StyledCanvas ref={ref} />;
};