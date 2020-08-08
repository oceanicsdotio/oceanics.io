import React, { useState, useEffect, useRef } from "react";
import { StyledCanvas, loadRuntime } from "../components/Canvas";


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

export default ({ count=8, key, font = "24px Arial" }) => {

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [cursor, setCursor] = useState([0.0, 0.0]);
    const [particleSystem, setParticleSystem] = useState(null);

    const caption = "Particles";
    const dim = "xyz";

    const config = {
        fade: 0.1,
        zero: 0.0,
        cursor: [0, 0, 0],
        padding: 0.0,
        radius: 8,
        drag: 0.001,
        torque: 3.0,
        bounce: 0.2,
        delta: {
            x: 0,
            y: 0,
            drag: 0.0,
            t: 0.0
        }
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

        particles.forEach((p, ii) => {
            for (let jj = ii + 1; jj < count; jj++) {
                p.links[jj] = {
                    vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                    spring: new runtime.Spring(0.002, 0.0, 0.0, 0.5, 0.4, 1 / Math.log(count))
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
        let offset = particleSystem.map(({coordinates}) => Array.from(coordinates).fill(0.0));
        let positions = particleSystem;
        let newPosition = null;

              
        (function render() {
            const time = performance.now() - start;
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#FFFFFF";

            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000066`);
            const { radius, fade, bounce, padding, cursor, drag } = config;

            positions.forEach(({ velocity, coordinates, heading, links }, ii) => {

                const speed = magnitude(velocity);
                const torque = cursor.map(item => item * config.torque * (0.5 - coordinates[2]));
                
                runtime.Agent.draw_agent(
                    ctx,
                    particleSystem.length,
                    ...shape.slice(0, 2),
                    ...coordinates.map((dim, jj) => dim + offset[ii][jj]),
                    ...heading.slice(0, 2),
                    fade,
                    Math.max((shape[2] - coordinates[2]) / shape[2] + 0.5, 0.0) * radius,
                    "#FFFFFF"
                );

                const newLinks = Object.entries(links).map(([jj, link]) => {

                    if (!link || !link.spring || !link.vec) return link;

                    const {spring, vec} = link;
                    const scale = spring.size(1.0);
                    let neighbor = positions[jj];
                    const newVec = coordinates.map((dim, index) => dim - neighbor.coordinates[index]);
                    const dist = magnitude(newVec);
                    spring.update(dist);

                    if ( spring.drop()) {
                        return {
                            vec: newVec,
                            spring: spring,
                        };
                    };
                    
                    const force = spring.force();

                    if (isNaN(dist) || isNaN(force)) {
                        console.log([neighbor, jj, coordinates, newPosition]);
                        throw Error(`Bad value for dist=${dist}, vec=${newVec}`);
                    }

                    let scaled = [];

            
                    let newLink = {
                        vec: vec.map((k, index) => {
                            
                            const delta = dist ? k / dist * force : 0.0;
                            
                            velocity[index] += delta;
                            neighbor.velocity[index] -= delta;
                            const val = coordinates[index] - neighbor.coordinates[index];
                            scaled.push(val * scale);
                            return val;
                        }),
                        spring: spring,
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
                        ctx.strokeStyle = "#FFFFFFFF";
                    } 
                    ctx.globalAlpha = 1.0;
                    ctx.beginPath();
                    ctx.moveTo(...start.slice(0, 2));
                    ctx.lineTo(...end.slice(0, 2));
                    ctx.stroke();

                    // positions[jj] = neighbor;
                    
                    return newLink;
                });
                

                newPosition = {
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

                positions[ii] = newPosition;
    
            });
            frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
            if (caption) runtime.draw_caption(ctx, caption, 0.0, height, "#77CCFF", font);
            sleep(100);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);

    return <StyledCanvas id={key} ref={ref} />;
};